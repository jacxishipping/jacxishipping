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
import { Calculator, MapPin, Truck, ArrowRight, CheckCircle2 } from 'lucide-react';
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
};

export default function ShipmentCalculator() {
    const [origin, setOrigin] = useState('');
    const [pickupLocation, setPickupLocation] = useState('');
    const [vehicleType, setVehicleType] = useState('sedan');
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

        setEstimatedCost(Math.round(baseRate * multiplier));
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
                            From
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
                            To
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MapPin size={16} className="text-green-500" />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {config.destinationLabel}
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
                                const activeList = company.priceLists?.[0];
                                const rowCount = activeList
                                    ? activeList.importedAuctionRateCount || activeList.importedStateRateCount
                                    : company.priceListConfig?.auctionRates?.length || 0;
                                return (
                                    <MenuItem key={company.id} value={company.id}>
                                        {company.name}{rowCount ? ` (${rowCount} rates)` : ' (no uploaded list)'}
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
                                borderRadius: 2, 
                                bgcolor: calculationTrace?.isExactLocation ? 'rgba(34, 197, 94, 0.08)' : 'rgba(var(--accent-gold-rgb), 0.12)', 
                                border: calculationTrace?.isExactLocation ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(var(--accent-gold-rgb), 0.6)',
                                textAlign: 'center'
                            }}>
                                <Box sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    px: 1.25,
                                    py: 0.35,
                                    borderRadius: 1.5,
                                    bgcolor: calculationTrace?.isExactLocation ? 'rgba(34, 197, 94, 0.15)' : 'rgba(var(--accent-gold-rgb), 0.18)',
                                    color: calculationTrace?.isExactLocation ? '#15803d' : 'var(--accent-gold)',
                                    fontWeight: 800,
                                    fontSize: '0.75rem',
                                    mb: 1,
                                    letterSpacing: '0.05em'
                                }}>
                                    {calculationTrace?.isExactLocation ? <CheckCircle2 size={14} /> : <MapPin size={14} />}
                                    {calculationTrace?.isExactLocation ? 'EXACT LOCATION RATE' : 'STATE FLAT RATE'}
                                </Box>
                                <Typography variant="h3" sx={{ fontWeight: 800, color: 'var(--text-primary)', my: 0.5 }}>
                                    {formatCurrency(estimatedCost)}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                                    {calculationTrace?.isExactLocation 
                                        ? `Exact price for ${calculationTrace?.laneLabel} (${calculationTrace?.companyName})`
                                        : `State rate for ${origin}. Select a pickup location above for the exact auction price.`}
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block', color: 'var(--text-secondary)', fontStyle: 'italic', mt: 0.5 }}>
                                    *Rates include ocean freight & standard handling to {config.destinationLabel}.
                                </Typography>
                                {calculationTrace && (
                                    <Typography variant="caption" sx={{ display: 'block', color: 'var(--text-secondary)', mt: 1 }}>
                                        Source: {calculationTrace.companyName} • {calculationTrace.priceListName} • Base {formatCurrency(calculationTrace.baseRate)} x {calculationTrace.multiplier} ({calculationTrace.rowSource})
                                    </Typography>
                                )}
                            </Box>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>
        </Paper>
    );
}