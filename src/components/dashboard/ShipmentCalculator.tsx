'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useMemo, useEffect, useState } from 'react';
import { 
    Box, 
    MenuItem, 
    FormControl, 
    Select, 
    InputLabel, 
    Typography,
    Paper,
    TextField,
    Chip
} from '@mui/material';
import { Button } from '@/components/design-system';
import { Calculator, MapPin, Truck, ArrowRight, CheckCircle2, Ship, ShieldCheck, Navigation, Printer } from 'lucide-react';
import { printTransitPriceList } from '@/lib/price-list-print';
import { motion, AnimatePresence } from 'framer-motion';
import {
    type AuctionRateEntry,
    DEFAULT_SHIPPING_RATE_CONFIG,
    US_STATES,
    type ShippingRateCalculatorConfig,
    normalizeShippingRateConfig,
} from '@/lib/shipping-rate-calculator';

type CompanyRateOption = {
    id: string;
    name: string;
    priceListConfig?: ShippingRateCalculatorConfig | null;
    priceLists?: Array<{
        id: string;
        name: string;
        importedAuctionRateCount: number;
        importedStateRateCount: number;
        destinationLabel: string;
        sourceFileName: string;
        createdAt: string;
        config?: unknown;
    }>;
};

type CalculatorAuctionRate = AuctionRateEntry & {
    companyId?: string;
    companyName?: string;
    priceListName?: string;
    sourceFileName?: string;
};

type CalculationTrace = {
    companyName: string;
    priceListName: string;
    priceListId: string;
    sourceFileName: string;
    baseRate: number;
    multiplier: number;
    rowSource: string;
    rowConfidence: string;
    laneLabel: string;
    isExactLocation: boolean;
    locationName?: string;
    // Dual-leg details
    destinationScope: 'door_islam_qala' | 'port_only';
    oceanCost: number;
    transitCost: number;
    portName: string;
    transitOrigin: string;
    transitDestination: string;
};

export default function ShipmentCalculator() {
    const [origin, setOrigin] = useState('');
    const [pickupLocation, setPickupLocation] = useState('');
    const [vehicleType, setVehicleType] = useState('sedan');
    const [destinationScope, setDestinationScope] = useState<'door_islam_qala' | 'port_only'>('door_islam_qala');
    const [pickupCity, setPickupCity] = useState('');
    const [pickupBranch, setPickupBranch] = useState('');
    const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
    const [config, setConfig] = useState<ShippingRateCalculatorConfig>(DEFAULT_SHIPPING_RATE_CONFIG);
    const [defaultConfig, setDefaultConfig] = useState<ShippingRateCalculatorConfig>(DEFAULT_SHIPPING_RATE_CONFIG);
    const [companies, setCompanies] = useState<CompanyRateOption[]>([]);
    const [companyId, setCompanyId] = useState('');
    const [calculationTrace, setCalculationTrace] = useState<CalculationTrace | null>(null);

    const selectedCompany = companies.find((company) => company.id === companyId);
    const activeCompanyPriceList = selectedCompany?.priceLists?.[0];

    useEffect(() => {
        let isMounted = true;

        fetch('/api/settings/shipping-rates', { cache: 'no-store' })
            .then((response) => response.ok ? response.json() : null)
            .then((data) => {
                if (isMounted && data?.config) {
                    setConfig(data.config);
                    setDefaultConfig(data.config);
                    setVehicleType(data.config.vehicleTypes?.[0]?.id || 'sedan');
                }
            })
            .catch(() => {
                if (isMounted) setConfig(DEFAULT_SHIPPING_RATE_CONFIG);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        fetch('/api/finance/companies?active=true&companyType=SHIPPING', { cache: 'no-store' })
            .then((response) => response.ok ? response.json() : null)
            .then((data) => {
                if (isMounted) setCompanies(data?.companies || []);
            })
            .catch(() => {
                if (isMounted) setCompanies([]);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!companyId) {
            setConfig(defaultConfig);
            setEstimatedCost(null);
            setCalculationTrace(null);
            setPickupLocation('');
            return;
        }

        const selectedCompany = companies.find((company) => company.id === companyId);
        setConfig(normalizeShippingRateConfig(selectedCompany?.priceListConfig));
        setEstimatedCost(null);
        setCalculationTrace(null);
        setPickupLocation('');
        setPickupCity('');
        setPickupBranch('');
    }, [companies, companyId, defaultConfig]);

    // Aggregate exact auction lanes for the selected origin state
    const availableAuctionRates = useMemo<CalculatorAuctionRate[]>(() => {
        if (!origin) return [];
        if (companyId) {
            return config.auctionRates
                .filter((rate) => rate.stateCode === origin)
                .map((rate) => ({
                    ...rate,
                    companyId: selectedCompany?.id,
                    companyName: selectedCompany?.name,
                    priceListName: activeCompanyPriceList?.name || 'Active Price List',
                    sourceFileName: activeCompanyPriceList?.sourceFileName || '',
                }));
        }

        // When companyId is empty, aggregate auction rates from all active company price lists
        const list: CalculatorAuctionRate[] = [];
        for (const comp of companies) {
            const activeList = comp.priceLists?.[0];
            const compConfig = normalizeShippingRateConfig(activeList?.config || comp.priceListConfig);
            const matching = compConfig.auctionRates.filter((r) => r.stateCode === origin);
            for (const r of matching) {
                list.push({
                    ...r,
                    companyId: comp.id,
                    companyName: comp.name,
                    priceListName: activeList?.name || 'Active Price List',
                    sourceFileName: activeList?.sourceFileName || '',
                });
            }
        }

        if (list.length === 0) {
            return defaultConfig.auctionRates
                .filter((rate) => rate.stateCode === origin)
                .map((rate) => ({ ...rate, companyName: 'Default Rates' }));
        }

        return list;
    }, [origin, companyId, config, companies, selectedCompany, activeCompanyPriceList, defaultConfig]);

    const formatAuctionRateLabel = (rate: CalculatorAuctionRate) => {
        const location = [rate.branch, rate.city].filter(Boolean).join(' - ');
        const loadingPoint = rate.loadingPoint ? ` to ${rate.loadingPoint}` : '';
        const companyTag = !companyId && rate.companyName ? ` • ${rate.companyName}` : '';
        return `${location || rate.stateCode}${loadingPoint}: ${formatCurrency(rate.total)}${companyTag}`;
    };

    const handleCalculate = () => {
        if (!origin) return;

        let selectedAuctionRate: CalculatorAuctionRate | null = pickupLocation !== ''
            ? availableAuctionRates[Number(pickupLocation)] || null
            : null;

        // If not selected in dropdown, check if city or branch was typed
        if (!selectedAuctionRate && (pickupCity || pickupBranch)) {
            const qCity = pickupCity.trim().toLowerCase();
            const qBranch = pickupBranch.trim().toLowerCase();
            selectedAuctionRate = availableAuctionRates.find((r) => {
                const matchCity = qCity && (r.city.toLowerCase().includes(qCity) || qCity.includes(r.city.toLowerCase()));
                const matchBranch = qBranch && (r.branch.toLowerCase().includes(qBranch) || qBranch.includes(r.branch.toLowerCase()));
                return Boolean((qCity && matchCity) || (qBranch && matchBranch));
            }) || null;
        }

        const isExactLocation = Boolean(selectedAuctionRate);
        const baseRate = selectedAuctionRate ? selectedAuctionRate.total : (config.stateRates[origin] || config.fallbackRate);
        const multiplier = config.vehicleTypes.find(v => v.id === vehicleType)?.multiplier || 1;
        const oceanCost = Math.round(baseRate * multiplier);

        // Transit lookup: Check company active transit configuration
        const activeTransit = (selectedCompany?.priceListConfig as any)?.transit;
        const portName = (config.destinationLabel?.toLowerCase().includes('uae') || config.destinationLabel?.toLowerCase().includes('jebel'))
            ? 'Jebel Ali / Dubai, UAE'
            : 'Mersin Port, Turkey';

        const isSuvOrHeavy = vehicleType === 'suv' || vehicleType === 'pickup' || vehicleType === 'van' || vehicleType === 'heavy';
        const transitCost = destinationScope === 'door_islam_qala'
            ? (isSuvOrHeavy ? (activeTransit?.rates?.suv || 2400) : (activeTransit?.rates?.sedan || 2300))
            : 0;

        const totalCost = oceanCost + transitCost;

        setEstimatedCost(totalCost);
        setCalculationTrace({
            companyName: selectedAuctionRate?.companyName || selectedCompany?.name || 'Shipping Rate Sheet',
            priceListName: selectedAuctionRate?.priceListName || activeCompanyPriceList?.name || 'Default rate settings',
            priceListId: selectedAuctionRate?.companyId || activeCompanyPriceList?.id || 'rate-sheet',
            sourceFileName: selectedAuctionRate?.sourceFileName || activeCompanyPriceList?.sourceFileName || config.updatedFromPdfName || 'manual settings',
            baseRate,
            multiplier,
            rowSource: isExactLocation ? 'Exact Location Rate' : (config.stateRates[origin] ? 'State Flat Rate' : 'Fallback Rate'),
            rowConfidence: isExactLocation ? 'high' : 'standard',
            laneLabel: selectedAuctionRate
                ? `${[selectedAuctionRate.branch, selectedAuctionRate.city].filter(Boolean).join(' - ')}, ${selectedAuctionRate.stateCode}`
                : `${origin} State Rate`,
            isExactLocation,
            locationName: selectedAuctionRate
                ? [selectedAuctionRate.branch, selectedAuctionRate.city].filter(Boolean).join(' - ')
                : undefined,
            destinationScope,
            oceanCost,
            transitCost,
            portName,
            transitOrigin: activeTransit?.origin || portName,
            transitDestination: activeTransit?.destination || 'Islam Qala, Herat (Afghanistan)',
        });
    };

    return (
        <Paper 
            elevation={0}
            sx={{ 
                p: 0, 
                borderRadius: 3, 
                overflow: 'hidden', 
                border: '1px solid var(--border)',
                background: 'linear-gradient(145deg, var(--panel), var(--background))',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <Box sx={{ 
                p: 3, 
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                backgroundColor: 'var(--panel)'
            }}>
                <Box sx={{ 
                    p: 1.5, 
                    borderRadius: 2, 
                    bgcolor: 'var(--accent-gold)', 
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(218, 165, 32, 0.3)'
                }}>
                    <Calculator size={24} />
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                        Quick Rate Calculator
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                        Exact location shipping quotes to {config.destinationLabel}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                
                {/* Destination Corridor Scope Selector */}
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 1,
                    p: 0.5,
                    bgcolor: 'var(--background)',
                    borderRadius: 2,
                    border: '1px solid var(--border)',
                }}>
                    <Button
                        variant={destinationScope === 'door_islam_qala' ? 'primary' : 'ghost'}
                        size="sm"
                        icon={<Truck size={14} />}
                        onClick={() => {
                            setDestinationScope('door_islam_qala');
                            setEstimatedCost(null);
                            setCalculationTrace(null);
                        }}
                    >
                        Door to Islam Qala (2 Legs)
                    </Button>
                    <Button
                        variant={destinationScope === 'port_only' ? 'primary' : 'ghost'}
                        size="sm"
                        icon={<Ship size={14} />}
                        onClick={() => {
                            setDestinationScope('port_only');
                            setEstimatedCost(null);
                            setCalculationTrace(null);
                        }}
                    >
                        Port Only ({config.destinationLabel?.split(',')[0] || 'Mersin/UAE'})
                    </Button>
                </Box>

                {/* Route Visual */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1.25,
                    bgcolor: 'var(--background)',
                    borderRadius: 2,
                    border: '1px solid var(--border)'
                }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>
                            From (Auction)
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MapPin size={16} className="text-red-500" />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {origin ? US_STATES.find(s => s.code === origin)?.name : 'Origin (USA)'}
                            </Typography>
                        </Box>
                    </Box>
                    <ArrowRight size={16} style={{ color: 'var(--text-secondary)' }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {destinationScope === 'door_islam_qala' ? 'Final Destination' : 'Port of Arrival'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MapPin size={16} className="text-green-500" />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {destinationScope === 'door_islam_qala' ? 'Islam Qala, Herat (Afghanistan)' : (config.destinationLabel || 'Port of Arrival')}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Company Rate Sheet</InputLabel>
                        <Select
                            value={companyId}
                            label="Company Rate Sheet"
                            onChange={(e) => {
                                setCompanyId(e.target.value);
                                setPickupLocation('');
                                setPickupCity('');
                                setPickupBranch('');
                                setEstimatedCost(null);
                                setCalculationTrace(null);
                            }}
                            sx={{ bgcolor: 'var(--background)' }}
                        >
                            <MenuItem value="">All Companies (Exact Location Rates)</MenuItem>
                            {companies.map((company) => {
                                const hasTransit = Boolean((company.priceListConfig as any)?.transit || company.priceLists?.some((p) => p.destinationLabel?.toLowerCase().includes('islam')));
                                const activeList = company.priceLists?.[0];
                                const rowCount = activeList
                                    ? activeList.importedAuctionRateCount || activeList.importedStateRateCount
                                    : company.priceListConfig?.auctionRates?.length || 0;
                                return (
                                    <MenuItem key={company.id} value={company.id}>
                                        {company.name}{rowCount ? ` (${rowCount} ocean lanes)` : ''}{hasTransit ? ' • Overland Transit Active' : ''}
                                    </MenuItem>
                                );
                            })}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth size="small">
                        <InputLabel>Pickup State</InputLabel>
                        <Select
                            value={origin}
                            label="Pickup State"
                            onChange={(e) => {
                                setOrigin(e.target.value);
                                setPickupLocation('');
                                setEstimatedCost(null); // Reset on change
                                setCalculationTrace(null);
                            }}
                            sx={{ bgcolor: 'var(--background)' }}
                        >
                            {US_STATES.map((state) => (
                                <MenuItem key={state.code} value={state.code}>
                                    {state.name} ({state.code})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {availableAuctionRates.length > 0 && (
                        <FormControl fullWidth size="small">
                            <InputLabel>Pickup Location (Exact Price)</InputLabel>
                            <Select
                                value={pickupLocation}
                                label="Pickup Location (Exact Price)"
                                onChange={(e) => {
                                    setPickupLocation(e.target.value);
                                    setEstimatedCost(null);
                                    setCalculationTrace(null);
                                }}
                                sx={{ bgcolor: 'var(--background)' }}
                            >
                                <MenuItem value="">
                                    {companyId
                                        ? `State flat rate (${formatCurrency(config.stateRates[origin] || config.fallbackRate)})`
                                        : 'Select location for exact price'}
                                </MenuItem>
                                {availableAuctionRates.map((rate, index) => (
                                    <MenuItem key={`${rate.companyId || ''}-${rate.stateCode}-${rate.branch}-${rate.city}-${index}`} value={String(index)}>
                                        {formatAuctionRateLabel(rate)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {!pickupLocation && (
                        <>
                            <TextField
                                label="Pickup City"
                                size="small"
                                value={pickupCity}
                                onChange={(event) => {
                                    setPickupCity(event.target.value);
                                    setEstimatedCost(null);
                                    setCalculationTrace(null);
                                }}
                                placeholder="e.g. Florence, Los Angeles"
                                sx={{ bgcolor: 'var(--background)' }}
                            />
                            <TextField
                                label="Auction Branch"
                                size="small"
                                value={pickupBranch}
                                onChange={(event) => {
                                    setPickupBranch(event.target.value);
                                    setEstimatedCost(null);
                                    setCalculationTrace(null);
                                }}
                                placeholder="e.g. Copart, IAA"
                                sx={{ bgcolor: 'var(--background)' }}
                            />
                        </>
                    )}

                    <FormControl fullWidth size="small">
                        <InputLabel>Vehicle Type</InputLabel>
                        <Select
                            value={vehicleType}
                            label="Vehicle Type"
                            onChange={(e) => {
                                setVehicleType(e.target.value);
                                setEstimatedCost(null); // Reset on change
                                setCalculationTrace(null);
                            }}
                            sx={{ bgcolor: 'var(--background)' }}
                        >
                            {config.vehicleTypes.map((type) => (
                                <MenuItem key={type.id} value={type.id}>
                                    {type.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <Box sx={{ mt: 'auto', pt: 1 }}>
                    <Button 
                        variant="primary" 
                        fullWidth 
                        size="lg"
                        onClick={handleCalculate}
                        disabled={!origin}
                        icon={<Truck size={18} />}
                    >
                        Calculate Rate
                    </Button>
                    <Typography
                        variant="caption"
                        sx={{ display: 'block', textAlign: 'center', mt: 1, color: 'var(--text-secondary)' }}
                    >
                        {pickupLocation !== '' && availableAuctionRates[Number(pickupLocation)]
                            ? `Exact location rate: ${formatAuctionRateLabel(availableAuctionRates[Number(pickupLocation)])}.`
                            : availableAuctionRates.length > 0
                                ? `${availableAuctionRates.length} exact auction locations available for ${origin}. Select one to see exact price.`
                                : activeCompanyPriceList
                                    ? `Using ${activeCompanyPriceList.name} from ${activeCompanyPriceList.sourceFileName}.`
                                    : 'Rates update daily and include ocean freight & standard handling.'}
                    </Typography>
                </Box>

                <AnimatePresence>
                    {estimatedCost !== null && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                        >
                            <Box sx={{ 
                                mt: 2, 
                                p: 2.5, 
                                borderRadius: 2.5, 
                                bgcolor: calculationTrace?.isExactLocation ? 'rgba(34, 197, 94, 0.08)' : 'rgba(var(--accent-gold-rgb), 0.1)', 
                                border: calculationTrace?.isExactLocation ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(var(--accent-gold-rgb), 0.5)',
                                textAlign: 'center'
                            }}>
                                <Box sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    px: 1.25,
                                    py: 0.35,
                                    borderRadius: 1.5,
                                    bgcolor: calculationTrace?.destinationScope === 'door_islam_qala' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(59, 130, 246, 0.18)',
                                    color: calculationTrace?.destinationScope === 'door_islam_qala' ? '#047857' : '#1d4ed8',
                                    fontWeight: 800,
                                    fontSize: '0.75rem',
                                    mb: 1,
                                    letterSpacing: '0.05em'
                                }}>
                                    {calculationTrace?.destinationScope === 'door_islam_qala' ? <Truck size={14} /> : <Ship size={14} />}
                                    {calculationTrace?.destinationScope === 'door_islam_qala' ? 'DOOR-TO-ISLAM QALA, HERAT (2-LEG QUOTE)' : 'PORT OCEAN FREIGHT'}
                                </Box>

                                <Typography variant="h3" sx={{ fontWeight: 850, color: 'var(--text-primary)', my: 0.5 }}>
                                    {formatCurrency(estimatedCost)}
                                </Typography>

                                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                                    {calculationTrace?.destinationScope === 'door_islam_qala'
                                        ? `Total door-to-border landed price from ${calculationTrace?.laneLabel} to Islam Qala, Afghanistan`
                                        : `Port ocean freight for ${calculationTrace?.laneLabel} ➔ ${calculationTrace?.portName}`}
                                </Typography>

                                {/* Two-Leg Breakdown Cards (Door-to-Islam Qala) */}
                                {calculationTrace?.destinationScope === 'door_islam_qala' && (
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mt: 2, textAlign: 'left' }}>
                                        {/* Leg 1 Breakdown */}
                                        <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid var(--border)', bgcolor: 'var(--panel)' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                                <Ship size={14} className="text-blue-600" />
                                                Leg 1: Ocean Freight
                                            </Box>
                                            <Box sx={{ fontSize: '1.25rem', fontWeight: 850, color: 'var(--text-primary)', mt: 0.5 }}>
                                                {formatCurrency(calculationTrace.oceanCost)}
                                            </Box>
                                            <Box sx={{ fontSize: '0.74rem', color: 'var(--text-secondary)', mt: 0.25 }}>
                                                US Auction Yard ➔ {calculationTrace.portName}
                                            </Box>
                                            <Box sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)', mt: 0.25 }}>
                                                Base {formatCurrency(calculationTrace.baseRate)} × {calculationTrace.multiplier} ({calculationTrace.rowSource})
                                            </Box>
                                        </Box>

                                        {/* Leg 2 Breakdown */}
                                        <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid rgba(16, 185, 129, 0.4)', bgcolor: 'rgba(16, 185, 129, 0.06)' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.72rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>
                                                <Truck size={14} className="text-emerald-600" />
                                                Leg 2: Overland Transit
                                            </Box>
                                            <Box sx={{ fontSize: '1.25rem', fontWeight: 850, color: 'var(--text-primary)', mt: 0.5 }}>
                                                {formatCurrency(calculationTrace.transitCost)}
                                            </Box>
                                            <Box sx={{ fontSize: '0.74rem', color: 'var(--text-secondary)', mt: 0.25 }}>
                                                {calculationTrace.portName} ➔ Islam Qala Border
                                            </Box>
                                            <Box sx={{ fontSize: '0.7rem', color: '#15803d', mt: 0.25, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <ShieldCheck size={12} />
                                                Customs clearance included
                                            </Box>
                                        </Box>
                                    </Box>
                                )}

                                <Typography variant="caption" sx={{ display: 'block', color: 'var(--text-secondary)', fontStyle: 'italic', mt: 1.5 }}>
                                    {calculationTrace?.destinationScope === 'door_islam_qala'
                                        ? `*Quote covers US towing, ocean container shipping to ${calculationTrace?.portName}, port customs clearance, and overland transit to Islam Qala.`
                                        : `*Quote covers ocean freight and standard terminal handling to ${config.destinationLabel}.`}
                                </Typography>
                                {calculationTrace && (
                                    <Typography variant="caption" sx={{ display: 'block', color: 'var(--text-secondary)', mt: 0.75 }}>
                                        Source: {calculationTrace.companyName} • {calculationTrace.priceListName} ({calculationTrace.isExactLocation ? 'Exact Auction Lane' : 'State Rate'})
                                    </Typography>
                                )}

                                {calculationTrace?.destinationScope === 'door_islam_qala' && (
                                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            icon={<Printer size={14} />}
                                            onClick={() => {
                                                const matchedCompany = companies.find((c) => c.name === calculationTrace.companyName);
                                                const transitData = (matchedCompany?.priceListConfig as any)?.transit;
                                                printTransitPriceList({
                                                    companyName: calculationTrace.companyName || 'JACXI SHIPPING',
                                                    companyType: 'Shipping Carrier',
                                                    priceListName: 'Overland Transit Tariff (Islam Qala)',
                                                    origin: transitData?.origin || `${calculationTrace.portName} Port, Turkey`,
                                                    destination: transitData?.destination || 'Islam Qala, Herat (Afghanistan)',
                                                    destinationLabel: 'Islam Qala, Herat',
                                                    effectiveFrom: transitData?.effectiveFrom || 'Current Active Tariff',
                                                    effectiveTo: transitData?.effectiveTo,
                                                    rates: transitData?.rates || { sedan: 2300, suv: 2400 },
                                                    terms: transitData?.terms,
                                                    carrierInfo: transitData?.company,
                                                });
                                            }}
                                        >
                                            Print Transit Tariff (Mersin ➔ Islam Qala)
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>
        </Paper>
    );
}