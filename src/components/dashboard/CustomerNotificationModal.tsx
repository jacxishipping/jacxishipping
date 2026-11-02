'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Copy,
  Check,
  X,
  Smartphone,
  Globe,
  Mail,
  ShieldCheck,
  FileText,
  ExternalLink,
  Bold,
  Italic,
  Code,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Lock,
  Phone,
  CheckCircle2,
  AlertCircle,
  QrCode,
} from 'lucide-react';
import { toast } from '@/components/design-system';

export interface CustomerNotificationPayload {
  shipmentId?: string;
  containerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  vehicleDetails?: string;
  vin?: string;
  lotNumber?: string;
  containerNumber?: string;
  vesselName?: string;
  portOfOrigin?: string;
  destinationPort?: string;
  trackingLink?: string;
  eta?: string;
  balanceDue?: string | number;
  invoiceNumber?: string;
  batchRecipients?: CustomerNotificationPayload[];
}

interface CustomerNotificationModalProps {
  open: boolean;
  onClose: () => void;
  payload: CustomerNotificationPayload;
}

type NotificationChannel = 'whatsapp' | 'sms' | 'email';
type TemplateLanguage = 'en' | 'ps' | 'fa' | 'ar';
type WhatsAppDispatchMode = 'auto' | 'wa_me' | 'api_only';

interface NotificationTemplate {
  id: string;
  name: string;
  tag: string;
  subject: string;
  bodies: Record<TemplateLanguage, string>;
}

const COUNTRY_PREFIXES = [
  { code: '+93', label: '🇦🇫 +93 (AF)' },
  { code: '+971', label: '🇦🇪 +971 (UAE)' },
  { code: '+1', label: '🇺🇸 +1 (US)' },
  { code: '+92', label: '🇵🇰 +92 (PK)' },
];

const LANGUAGES: { id: TemplateLanguage; label: string; native: string; rtl: boolean }[] = [
  { id: 'en', label: 'English', native: 'EN', rtl: false },
  { id: 'ps', label: 'Pashto', native: 'پښتو', rtl: true },
  { id: 'fa', label: 'Dari', native: 'دری', rtl: true },
  { id: 'ar', label: 'Arabic', native: 'العربية', rtl: true },
];

function formatClientPhoneE164(raw: string, defaultPrefix = '+93'): string {
  const cleaned = (raw || '').replace(/[^\d+]/g, '').trim();
  if (!cleaned) return '';
  const cc = defaultPrefix.replace(/[^\d]/g, '') || '93';
  if (cleaned.startsWith('+')) return `+${cleaned.slice(1).replace(/[^\d]/g, '')}`;
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith('0') && cleaned.length >= 9 && cleaned.length <= 11) {
    return `+${cc}${cleaned.slice(1)}`;
  }
  if (cc === '1' && cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 9 && (cc === '93' || cc === '971')) return `+${cc}${cleaned}`;
  return `+${cleaned}`;
}

export function CustomerNotificationModal({ open, onClose, payload }: CustomerNotificationModalProps) {
  const recipients = useMemo(
    () => (payload.batchRecipients && payload.batchRecipients.length > 0 ? payload.batchRecipients : [payload]),
    [payload],
  );
  const [recipientIndex, setRecipientIndex] = useState(0);
  const activePayload = recipients[recipientIndex] || payload;

  const [channel, setChannel] = useState<NotificationChannel>('whatsapp');
  const [language, setLanguage] = useState<TemplateLanguage>('en');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('container_loaded');
  const [waDispatchMode, setWaDispatchMode] = useState<WhatsAppDispatchMode>('auto');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [defaultCountryCode, setDefaultCountryCode] = useState('+93');

  const [customPhone, setCustomPhone] = useState(activePayload.customerPhone || '');
  const [customEmail, setCustomEmail] = useState(activePayload.customerEmail || '');
  const [customSubject, setCustomSubject] = useState('');

  // Branded Document Attachments
  const [attachReceipt, setAttachReceipt] = useState(false);
  const [attachGatePass, setAttachGatePass] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [signedLinks, setSignedLinks] = useState<{ receiptUrl?: string; gatePassUrl?: string } | null>(null);
  const [lastDispatchInfo, setLastDispatchInfo] = useState<{
    ok: boolean;
    mode: string;
    waMeUrl?: string;
    message?: string;
  } | null>(null);

  useEffect(() => {
    setCustomPhone(activePayload.customerPhone || '');
    setCustomEmail(activePayload.customerEmail || '');
    setSignedLinks(null);
    setAttachReceipt(false);
    setAttachGatePass(false);
    setLastDispatchInfo(null);
  }, [activePayload]);

  const templates: NotificationTemplate[] = useMemo(() => {
    const customer = activePayload.customerName || 'Valued Customer';
    const vehicle = activePayload.vehicleDetails || 'Vehicle';
    const vin = activePayload.vin || 'N/A';
    const container = activePayload.containerNumber || 'PENDING';
    const origin = activePayload.portOfOrigin || 'US Export Yard';
    const dest = activePayload.destinationPort || 'Destination Port';
    const eta = activePayload.eta || 'On Schedule';
    const track = activePayload.trackingLink || 'https://www.jacxishipping.com/tracking';
    const balance =
      activePayload.balanceDue !== undefined && activePayload.balanceDue !== null
        ? typeof activePayload.balanceDue === 'number'
          ? `$${activePayload.balanceDue.toLocaleString()}`
          : String(activePayload.balanceDue)
        : 'Pending Statement';

    return [
      {
        id: 'yard_received',
        name: '1. Received at Export Yard',
        tag: 'Warehouse',
        subject: `Vehicle Received at Export Yard - ${vehicle} (${vin})`,
        bodies: {
          en: `🏢 *JACXI SHIPPING & LOGISTICS*\n\nHello *${customer}*,\n\nYour vehicle *${vehicle}* (VIN: \`${vin}\`) has safely arrived at our export warehouse in *${origin}*.\n\n✅ Yard inspection & thermal QR tagging completed.\n🌐 *Track Live Status:* ${track}\n\nThank you for shipping with JACXI!`,
          ps: `🏢 *جکسي بارچلاونه او لوژستیک (JACXI)*\n\nمحترم *${customer}*، سلامونه!\n\nستاسو موټر *${vehicle}* (شاسي نمبر: \`${vin}\`) په *${origin}* کې زموږ د صادراتو ګودام ته په خوندي توګه راورسېد.\n\n✅ د ګودام معاینه او ثبت بشپړ شو.\n🌐 *ژوندۍ تعقیب:* ${track}\n\nله جکسي شرکت څخه د انتخاب مننه!`,
          fa: `🏢 *شرکت حمل و نقل جکسی (JACXI)*\n\nمحترم *${customer}*، سلام و احترام!\n\nموتر شما *${vehicle}* (شاسی: \`${vin}\`) به گدام صادراتی ما در *${origin}* به سلامت رسید.\n\n✅ بررسی گدام و ثبت بارکد تکمیل گردید.\n🌐 *پیگیری آنلاین:* ${track}\n\nتشکر از اعتماد شما به جکسی شیپینگ!`,
          ar: `🏢 *جاكسي للشحن والخدمات اللوجستية (JACXI)*\n\nمرحباً *${customer}*،\n\nلقد وصلت مركبتكم *${vehicle}* (رقم الشاصي: \`${vin}\`) بأمان إلى مستودع التصدير في *${origin}*.\n\n✅ تم إكمال الفحص والتوثيق.\n🌐 *تتبع الشحنة مباشرة:* ${track}`,
        },
      },
      {
        id: 'container_loaded',
        name: '2. Loaded in Ocean Container',
        tag: 'Loading Bay',
        subject: `Container Loading Confirmation - ${container}`,
        bodies: {
          en: `📦 *JACXI SHIPPING & LOGISTICS*\n\nHello *${customer}*,\n\nYour vehicle *${vehicle}* (VIN: \`${vin}\`) is now safely loaded and secured inside Ocean Container *#${container}*.\n\n📍 *Destination:* ${dest}\n📅 *Estimated Arrival:* ${eta}\n🌐 *Track Ocean Progress:* ${track}`,
          ps: `📦 *جکسي بارچلاونه او لوژستیک (JACXI)*\n\nمحترم *${customer}*،\n\nستاسو موټر *${vehicle}* (شاسي: \`${vin}\`) په بریالیتوب سره په *#${container}* کانټینر کې بار او خوندي شو.\n\n📍 *مقصد:* ${dest}\n📅 *د رسېدو اټکلي نېټه:* ${eta}\n🌐 *تعقیب لینک:* ${track}`,
          fa: `📦 *شرکت حمل و نقل جکسی (JACXI)*\n\nمحترم *${customer}*،\n\nموتر شما *${vehicle}* (شاسی: \`${vin}\`) به صورت مصئون در کانتینر شماره *#${container}* بارگیری شد.\n\n📍 *مقصد:* ${dest}\n📅 *زمان تخمینی رسیدن:* ${eta}\n🌐 *لینک پیگیری:* ${track}`,
          ar: `📦 *جاكسي للشحن والخدمات اللوجستية*\n\nمرحباً *${customer}*،\n\nتم تحميل وتأمين مركبتكم *${vehicle}* (الشاصي: \`${vin}\`) داخل الحاوية البحرية رقم *#${container}*.\n\n📍 *الوجهة:* ${dest}\n📅 *الوصول المتوقع:* ${eta}\n🌐 *تتبع المسار البحري:* ${track}`,
        },
      },
      {
        id: 'vessel_departed',
        name: '3. Vessel Sailed / Ocean Transit',
        tag: 'Ocean AIS',
        subject: `Ocean Vessel Sailed - Container #${container}`,
        bodies: {
          en: `🚢 *JACXI SHIPPING & LOGISTICS*\n\nDear *${customer}*,\n\nThe ocean vessel carrying Container *#${container}* (*${vehicle}* • \`${vin}\`) has departed *${origin}* and is en route to *${dest}*.\n\n📅 *Estimated ETA:* ${eta}\n🌐 *Live Vessel Tracking:* ${track}`,
          ps: `🚢 *جکسي بارچلاونه او لوژستیک*\n\nمحترم *${customer}*،\n\nهغه بحري کښتۍ چې ستاسو کانټینر *#${container}* (*${vehicle}* • \`${vin}\`) پکې بار دی، له *${origin}* څخه د *${dest}* په لور حرکت وکړ.\n\n📅 *د رسېدو وخت:* ${eta}\n🌐 *ژوندۍ موقعیت:* ${track}`,
          fa: `🚢 *شرکت حمل و نقل جکسی*\n\nمحترم *${customer}*،\n\nکشتی حامل کانتینر *#${container}* (*${vehicle}* • \`${vin}\`) بندر *${origin}* را به مقصد *${dest}* ترک کرد.\n\n📅 *زمان رسیدن:* ${eta}\n🌐 *موقعیت زنده کشتی:* ${track}`,
          ar: `🚢 *جاكسي للشحن والخدمات اللوجستية*\n\nعزيزنا *${customer}*،\n\nغادرت السفينة البحرية التي تحمل الحاوية *#${container}* (*${vehicle}* • \`${vin}\`) ميناء *${origin}* متجهةً إلى *${dest}*.\n\n📅 *الموعد المتوقع للوصول:* ${eta}\n🌐 *التتبع المباشر:* ${track}`,
        },
      },
      {
        id: 'arrived_port',
        name: '4. Arrived at Destination Port',
        tag: 'Terminal',
        subject: `Arrived at Port - ${vehicle} (${container})`,
        bodies: {
          en: `⚓ *JACXI SHIPPING & LOGISTICS*\n\nGood news *${customer}*!\n\nContainer *#${container}* carrying your *${vehicle}* (VIN: \`${vin}\`) has docked at *${dest}*.\n\nPort offloading and customs transit processing are now underway.\n🌐 *View Details:* ${track}`,
          ps: `⚓ *جکسي بارچلاونه او لوژستیک*\n\nزېری محترم *${customer}*!\n\nستاسو کانټینر *#${container}* چې موټر *${vehicle}* (\`${vin}\`) پکې دی، د *${dest}* بندر ته ورسېد.\n\nد کانټینر ښکته کولو او ګمرکي چارو بهیر پیل شوی دی.\n🌐 *معلومات:* ${track}`,
          fa: `⚓ *شرکت حمل و نقل جکسی*\n\nخبر خوش محترم *${customer}*!\n\nکانتینر *#${container}* حامل موتر *${vehicle}* (\`${vin}\`) به بندر *${dest}* رسید.\n\nمراحل تخلیه و تشریفات گمرکی در حال انجام است.\n🌐 *جزئیات:* ${track}`,
          ar: `⚓ *جاكسي للشحن والخدمات اللوجستية*\n\nأخبار سارة *${customer}*!\n\nوصلت الحاوية *#${container}* التي تحمل مركبتكم *${vehicle}* (\`${vin}\`) إلى ميناء *${dest}*.\n\nجاري حالياً التفريغ وإجراءات التخليص.\n🌐 *التفاصيل:* ${track}`,
        },
      },
      {
        id: 'customs_cleared',
        name: '5. Customs Cleared & Ready',
        tag: 'Customs',
        subject: `Customs Clearance Complete - ${vehicle}`,
        bodies: {
          en: `✅ *JACXI SHIPPING & LOGISTICS*\n\nGreat news *${customer}*!\n\nYour vehicle *${vehicle}* (VIN: \`${vin}\`) has cleared customs at *${dest}* and is ready for release & pickup at the yard.\n\n🪪 Please bring your Consignee ID and B/L copy for Gate Pass release.\n📞 Support: +93 70 411 7413`,
          ps: `✅ *جکسي بارچلاونه او لوژستیک*\n\nښه خبر محترم *${customer}*!\n\nستاسو موټر *${vehicle}* (شاسي: \`${vin}\`) په *${dest}* کې ګمرکي مراحل بشپړ کړل او د تسلیمۍ لپاره چمتو دی.\n\n🪪 مهرباني وکړئ د ګیټ پاس اخیستلو لپاره خپله تذکره او اسناد راوړئ.\n📞 اړیکه: +93 70 411 7413`,
          fa: `✅ *شرکت حمل و نقل جکسی*\n\nخبر مسرت‌بخش محترم *${customer}*!\n\nموتر شما *${vehicle}* (شاسی: \`${vin}\`) در *${dest}* از گمرک ترخیص گردیده و آماده تحویل‌دهی می‌باشد.\n\n🪪 لطفاً جهت دریافت گیت‌پاس، تذکره و اسناد مربوطه را همراه داشته باشید.\n📞 تماس: +93 70 411 7413`,
          ar: `✅ *جاكسي للشحن والخدمات اللوجستية*\n\nأخبار رائعة *${customer}*!\n\nتم إتمام التخليص الجمركي لمركبتكم *${vehicle}* (الشاصي: \`${vin}\`) في *${dest}* وهي جاهزة للاستلام.\n\n🪪 يرجى إحضار إثبات الهوية لاستلام تصريح الخروج.\n📞 للتواصل: +93 70 411 7413`,
        },
      },
      {
        id: 'gate_pass_ready',
        name: '6. Gate Pass & Documents Issued',
        tag: 'Release',
        subject: `Official Gate Pass & Release Packet - ${vehicle}`,
        bodies: {
          en: `🪪 *JACXI OFFICIAL RELEASE NOTICE*\n\nHello *${customer}*,\n\nYour official *Gate Pass & Shipment Receipt* for *${vehicle}* (VIN: \`${vin}\`, Container: *#${container}*) have been issued.\n\n📍 *Release Location:* ${dest}\n🌐 *Portal & Documents:* ${track}`,
          ps: `🪪 *د جکسي رسمي ګیټ پاس او اسناد*\n\nمحترم *${customer}*،\n\nستاسو د موټر *${vehicle}* (شاسي: \`${vin}\`، کانټینر: *#${container}*) رسمي ګیټ پاس او رسید صادر شول.\n\n📍 *د تسلیمۍ ځای:* ${dest}\n🌐 *اسناد او تعقیب:* ${track}`,
          fa: `🪪 *گیت‌پاس و اسناد رسمی جکسی*\n\nمحترم *${customer}*،\n\nگیت‌پاس رسمی و رسید موتر *${vehicle}* (شاسی: \`${vin}\`، کانتینر: *#${container}*) صادر گردید.\n\n📍 *محل تحویل:* ${dest}\n🌐 *مشاهده اسناد:* ${track}`,
          ar: `🪪 *تصريح الخروج والمستندات الرسمية - جاكسي*\n\nمرحباً *${customer}*،\n\nتم إصدار تصريح الخروج الرسمي وإيصال الشحنة لمركبتكم *${vehicle}* (الشاصي: \`${vin}\`).\n\n📍 *موقع الاستلام:* ${dest}\n🌐 *رابط المستندات:* ${track}`,
        },
      },
      {
        id: 'payment_reminder',
        name: '7. Invoice & Balance Reminder',
        tag: 'Finance',
        subject: `Statement & Balance Notice - ${vehicle} (${vin})`,
        bodies: {
          en: `💳 *JACXI FINANCE & ACCOUNTING*\n\nDear *${customer}*,\n\nThis is a friendly reminder regarding the shipping balance for your vehicle *${vehicle}* (VIN: \`${vin}\`, Container: *#${container}*).\n\n💰 *Outstanding Balance:* ${balance}\n📍 *Current Status:* ${dest}\n\nPlease contact our accounting desk or reply to this message with your payment receipt so we can expedite release.\n📞 WhatsApp Finance: +93 70 411 7413`,
          ps: `💳 *د جکسي مالي او محاسبې څانګه*\n\nمحترم *${customer}*،\n\nستاسو د موټر *${vehicle}* (شاسي: \`${vin}\`، کانټینر: *#${container}*) د پاتې حساب په اړه یادونه:\n\n💰 *پاتې بیلانس:* ${balance}\n📍 *فعلي موقعیت:* ${dest}\n\nمهرباني وکړئ د ژر خلاصون لپاره خپل حساب تصفیه کړئ او رسید موږ ته راولېږئ.\n📞 اړیکه: +93 70 411 7413`,
          fa: `💳 *بخش مالی و محاسبه جکسی*\n\nمحترم *${customer}*،\n\nیادآوری محترمانه در مورد باقی‌داری حساب موتر *${vehicle}* (شاسی: \`${vin}\`، کانتینر: *#${container}*):\n\n💰 *بیلانـس باقی‌مانده:* ${balance}\n📍 *وضعیت فعلی:* ${dest}\n\nلطفاً جهت تسریع روند ترخیص، رسید پرداخت خود را ارسال نمایید.\n📞 واتساپ مالی: +93 70 411 7413`,
          ar: `💳 *قسم المالية والمحاسبة - جاكسي*\n\nعزيزنا *${customer}*،\n\nتذكير ودي بخصوص الرصيد المتبقي لشحنة مركبتكم *${vehicle}* (الشاصي: \`${vin}\`):\n\n💰 *الرصيد المستحق:* ${balance}\n📍 *الموقع الحالي:* ${dest}\n\nيرجى إرسال إيصال السداد لتسريع إجراءات التسليم.\n📞 واتساب المالية: +93 70 411 7413`,
        },
      },
      {
        id: 'delivery_completed',
        name: '8. Final Handover Confirmed',
        tag: 'Delivered',
        subject: `Delivery Confirmed - ${vehicle} (${vin})`,
        bodies: {
          en: `🎉 *JACXI SHIPPING & LOGISTICS*\n\nThank you *${customer}*!\n\nYour vehicle *${vehicle}* (VIN: \`${vin}\`) has been officially handed over and marked as *DELIVERED*.\n\nWe appreciate your trust in JACXI Shipping. We look forward to serving your future auto shipments!\n🌐 www.jacxishipping.com`,
          ps: `🎉 *جکسي بارچلاونه او لوژستیک*\n\nمحترم *${customer}*، ډېره مننه!\n\nستاسو موټر *${vehicle}* (شاسي: \`${vin}\`) په رسمي ډول تسلیم شو.\n\nپر جکسي شرکت ستاسو له باور څخه مننه کوو!\n🌐 www.jacxishipping.com`,
          fa: `🎉 *شرکت حمل و نقل جکسی*\n\nمحترم *${customer}*، سپاسگزاریم!\n\nموتر شما *${vehicle}* (شاسی: \`${vin}\`) به طور رسمی تحویل داده شد.\n\nاز اعتماد شما به شرکت جکسی صمیمانه سپاسگزاریم!\n🌐 www.jacxishipping.com`,
          ar: `🎉 *جاكسي للشحن والخدمات اللوجستية*\n\nشكراً لك *${customer}*!\n\nتم تسليم مركبتكم *${vehicle}* (الشاصي: \`${vin}\`) رسمياً بنجاح.\n\nنسعد دائماً بخدمتكم في جاكسي للشحن!\n🌐 www.jacxishipping.com`,
        },
      },
    ];
  }, [activePayload]);

  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0];
  }, [selectedTemplateId, templates]);

  const [messageBody, setMessageBody] = useState(activeTemplate.bodies[language]);

  // Synchronize template text when template, language, or recipient changes
  useEffect(() => {
    const tmpl = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    let nextBody = tmpl.bodies[language];
    if (attachReceipt && signedLinks?.receiptUrl) {
      nextBody += `\n\n🧾 *Official Receipt (PDF):* ${signedLinks.receiptUrl}`;
    }
    if (attachGatePass && signedLinks?.gatePassUrl) {
      nextBody += `\n\n🪪 *Official Gate Pass (PDF):* ${signedLinks.gatePassUrl}`;
    }
    setMessageBody(nextBody);
    setCustomSubject(tmpl.subject);
  }, [selectedTemplateId, language, templates, attachReceipt, attachGatePass, signedLinks]);

  const isRtl = useMemo(() => LANGUAGES.find((l) => l.id === language)?.rtl ?? false, [language]);
  const normalizedE164Phone = useMemo(
    () => formatClientPhoneE164(customPhone, defaultCountryCode),
    [customPhone, defaultCountryCode],
  );

  const ensureSignedLinks = async () => {
    if (signedLinks) return signedLinks;
    const targetId = activePayload.shipmentId || (activePayload.vin && activePayload.vin !== 'N/A' ? activePayload.vin : '');
    if (!targetId) {
      const fallbackUrl = activePayload.trackingLink || 'https://www.jacxishipping.com/tracking';
      const fallback = { receiptUrl: fallbackUrl, gatePassUrl: fallbackUrl };
      setSignedLinks(fallback);
      return fallback;
    }

    setLoadingLinks(true);
    try {
      const res = await fetch('/api/communications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signed_links',
          shipmentId: activePayload.shipmentId,
          vin: activePayload.vin,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const links = { receiptUrl: data.receiptUrl, gatePassUrl: data.gatePassUrl };
        setSignedLinks(links);
        return links;
      }
    } catch {
      // ignore error and fallback
    } finally {
      setLoadingLinks(false);
    }
    return null;
  };

  const handleToggleReceipt = async () => {
    const next = !attachReceipt;
    if (next && !signedLinks) {
      await ensureSignedLinks();
    }
    setAttachReceipt(next);
  };

  const handleToggleGatePass = async () => {
    const next = !attachGatePass;
    if (next && !signedLinks) {
      await ensureSignedLinks();
    }
    setAttachGatePass(next);
  };

  const handleInsertVariable = (tokenValue: string) => {
    setMessageBody((prev) => `${prev}${prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' '}${tokenValue}`);
  };

  const handleWrapFormat = (wrapper: string) => {
    setMessageBody((prev) => `${prev} ${wrapper}text${wrapper}`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageBody);
    setCopied(true);
    toast.success('Message copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWaMeDirect = () => {
    const digits = normalizedE164Phone.replace(/[^\d]/g, '');
    const encoded = encodeURIComponent(messageBody);
    const url = digits ? `https://wa.me/${digits}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success('Opened WhatsApp Business chat window');
  };

  const handleSend = async () => {
    setSending(true);
    setLastDispatchInfo(null);
    try {
      if (channel === 'whatsapp' && waDispatchMode === 'wa_me') {
        handleOpenWaMeDirect();
        setLastDispatchInfo({
          ok: true,
          mode: 'WhatsApp Direct Launch (wa.me)',
        });
        return;
      }

      const targetTo = channel === 'email' ? customEmail : normalizedE164Phone || customPhone;
      const res = await fetch('/api/communications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dispatch',
          channel,
          to: targetTo,
          subject: customSubject || activeTemplate.subject,
          message: messageBody,
          shipmentId: activePayload.shipmentId,
          vin: activePayload.vin,
        }),
      });

      const data = await res.json();

      if (channel === 'whatsapp') {
        if (data.deliveryMode === 'wa_me_deep_link' || (waDispatchMode === 'auto' && !data.ok)) {
          const waUrl =
            data.waMeUrl ||
            `https://wa.me/${normalizedE164Phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(messageBody)}`;
          window.open(waUrl, '_blank', 'noopener,noreferrer');
          toast.success('Launched WhatsApp Business with pre-filled message!');
          setLastDispatchInfo({
            ok: true,
            mode: 'WhatsApp App / Web (wa.me)',
            waMeUrl: waUrl,
          });
        } else if (data.ok) {
          toast.success(`WhatsApp Business API message dispatched (${data.provider})!`);
          setLastDispatchInfo({
            ok: true,
            mode: `Dispatched via ${data.provider === 'meta_cloud' ? 'Meta Cloud API' : 'Twilio WhatsApp API'}`,
            waMeUrl: data.waMeUrl,
          });
        } else {
          toast.error(data.error || data.message || 'WhatsApp API dispatch failed');
          setLastDispatchInfo({
            ok: false,
            mode: 'API Error — Click Open WhatsApp App to send manually',
            waMeUrl: data.waMeUrl,
            message: data.error || data.message,
          });
        }
        return;
      }

      if (!res.ok || !data.ok) {
        throw new Error(data.message || `Failed to dispatch ${channel.toUpperCase()}`);
      }

      toast.success(`${channel.toUpperCase()} notification dispatched successfully!`);
      setLastDispatchInfo({
        ok: true,
        mode: `${channel.toUpperCase()} Dispatched`,
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-2xl bg-[var(--panel)] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Studio Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  WhatsApp Business & Communication Studio
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Business Hub
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Multi-lingual milestone dispatch, signed PDF attachments & live WhatsApp Cloud / App integration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Batch Recipient Switcher if multiple shipments selected */}
            {recipients.length > 1 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-[var(--border)] bg-[var(--panel)] text-xs">
                <button
                  type="button"
                  disabled={recipientIndex === 0}
                  onClick={() => setRecipientIndex((i) => Math.max(0, i - 1))}
                  className="p-0.5 rounded hover:bg-[var(--background)] disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-[var(--accent-gold)]">
                  {recipientIndex + 1} / {recipients.length}
                </span>
                <button
                  type="button"
                  disabled={recipientIndex === recipients.length - 1}
                  onClick={() => setRecipientIndex((i) => Math.min(recipients.length - 1, i + 1))}
                  className="p-0.5 rounded hover:bg-[var(--background)] disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Left Column: Composer, Languages, Templates & Attachments (7 Cols) */}
          <div className="lg:col-span-7 p-5 sm:p-6 overflow-y-auto space-y-4 border-r border-[var(--border)]">
            {/* Row 1: Channel Selector + Language Switcher */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Communication Channel
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, activeCls: 'bg-emerald-600 text-white border-emerald-600' },
                    { id: 'sms', label: 'Direct SMS', icon: Smartphone, activeCls: 'bg-blue-600 text-white border-blue-600' },
                    { id: 'email', label: 'Email', icon: Mail, activeCls: 'bg-[var(--accent-gold)] text-white border-[var(--accent-gold)]' },
                  ].map((c) => {
                    const isSel = channel === c.id;
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setChannel(c.id as NotificationChannel)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                          isSel
                            ? `${c.activeCls} shadow-sm`
                            : 'bg-[var(--background)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent-gold)]/40'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-[var(--accent-gold)]" />
                  Template Language
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {LANGUAGES.map((lang) => {
                    const isSel = language === lang.id;
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => setLanguage(lang.id)}
                        title={lang.label}
                        className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all ${
                          isSel
                            ? 'bg-[var(--accent-gold)] text-white border-[var(--accent-gold)] shadow-xs'
                            : 'bg-[var(--background)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent-gold)]/40'
                        }`}
                      >
                        {lang.native}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Row 2: Smart Phone Number E.164 & Recipient Info */}
            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  Recipient Contact ({activePayload.customerName || 'Consignee'})
                </span>
                <div className="flex items-center gap-1">
                  {COUNTRY_PREFIXES.map((cp) => (
                    <button
                      key={cp.code}
                      type="button"
                      onClick={() => {
                        setDefaultCountryCode(cp.code);
                        if (!customPhone.trim()) {
                          setCustomPhone(`${cp.code} `);
                        }
                      }}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition-colors ${
                        defaultCountryCode === cp.code
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {cp.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      placeholder={`${defaultCountryCode} 70 411 7413`}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                    />
                    {normalizedE164Phone && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                        <CheckCircle2 className="w-3 h-3" />
                        E.164: {normalizedE164Phone}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="consignee@example.com (for Email)"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                  />
                  {activePayload.vin && activePayload.vin !== 'N/A' && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--text-secondary)] font-mono">
                      VIN: {activePayload.vin} • {activePayload.containerNumber || 'No Container'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Row 3: 8 Milestone & Finance Templates */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Select Logistics or Finance Template ({templates.length} Presets)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                {templates.map((tmpl) => {
                  const isSel = selectedTemplateId === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                        isSel
                          ? 'border-emerald-500 bg-emerald-500/8 shadow-xs'
                          : 'border-[var(--border)] bg-[var(--background)] hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {tmpl.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                            isSel
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[var(--panel)] text-[var(--text-secondary)] border border-[var(--border)]'
                          }`}
                        >
                          {tmpl.tag}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 4: 1-Click Branded Document Attachments */}
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--background)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                  1-Click Official Document Links (Signed PDFs)
                </span>
                {loadingLinks && (
                  <span className="text-[10px] text-[var(--accent-gold)] animate-pulse font-semibold">
                    Generating signed links...
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleToggleReceipt}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    attachReceipt
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] hover:border-[var(--accent-gold)]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  {attachReceipt ? '✓ Shipment Receipt PDF Attached' : '+ Attach Shipment Receipt PDF'}
                </button>

                <button
                  type="button"
                  onClick={handleToggleGatePass}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    attachGatePass
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] hover:border-[var(--accent-gold)]'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  {attachGatePass ? '✓ Official Gate Pass PDF Attached' : '+ Attach Gate Pass PDF'}
                </button>
              </div>
            </div>

            {/* Row 5: Message Editor with WhatsApp Formatting & Variable Injection */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mr-1">
                    Composer
                  </span>
                  <button
                    type="button"
                    onClick={() => handleWrapFormat('*')}
                    title="WhatsApp Bold (*text*)"
                    className="p-1 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Bold className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWrapFormat('_')}
                    title="WhatsApp Italic (_text_)"
                    className="p-1 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Italic className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWrapFormat('`')}
                    title="WhatsApp Monospace (`text`)"
                    className="p-1 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Code className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {messageBody.length} chars
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy Text'}
                  </button>
                </div>
              </div>

              {/* Dynamic Variable Quick-Insert Chips */}
              <div className="flex flex-wrap gap-1 mb-2">
                {[
                  { label: '+ Customer', val: activePayload.customerName || 'Valued Client' },
                  { label: '+ Vehicle', val: activePayload.vehicleDetails || 'Vehicle' },
                  { label: '+ VIN', val: `\`${activePayload.vin || 'N/A'}\`` },
                  { label: '+ Container', val: `*#${activePayload.containerNumber || 'PENDING'}*` },
                  { label: '+ ETA', val: activePayload.eta || 'TBD' },
                  { label: '+ Tracking URL', val: activePayload.trackingLink || 'https://www.jacxishipping.com/tracking' },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleInsertVariable(chip.val)}
                    className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <textarea
                rows={5}
                dir={isRtl ? 'rtl' : 'ltr'}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="w-full p-3 text-xs font-sans rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
              />
            </div>

            {/* Row 6: WhatsApp Dispatch Mode Selector */}
            {channel === 'whatsapp' && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  WhatsApp Delivery Mode:
                </span>
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'auto', label: '⚡ Smart Auto (API / App)' },
                    { id: 'wa_me', label: '💬 WhatsApp Web / App' },
                    { id: 'api_only', label: '☁️ Cloud API Only' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setWaDispatchMode(m.id as WhatsAppDispatchMode)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                        waDispatchMode === m.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live WhatsApp Business Smartphone Preview (5 Cols) */}
          <div className="lg:col-span-5 p-5 bg-[var(--background)] flex flex-col items-center justify-between overflow-y-auto">
            <div className="w-full flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-500" />
                Live WhatsApp Business Preview
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {isRtl ? 'RTL Layout' : 'LTR Layout'}
              </span>
            </div>

            {/* Smartphone Mockup */}
            <div className="relative w-[300px] h-[490px] rounded-[38px] bg-[#111] p-3 shadow-2xl border-4 border-neutral-800 flex flex-col shrink-0">
              {/* Dynamic Island */}
              <div className="w-24 h-4 bg-neutral-900 rounded-full mx-auto mb-2 shrink-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-neutral-700 mr-2" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>

              {/* WhatsApp Business Header */}
              <div className="px-3 py-2.5 bg-[#075E54] text-white rounded-t-2xl flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#080c14] border border-[#DDA853] flex items-center justify-center text-[11px] font-black text-[#DDA853]">
                    JX
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-[11px] font-bold leading-none">JACXI Shipping</p>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    </div>
                    <p className="text-[9px] text-emerald-100 leading-none mt-1 font-mono">
                      {normalizedE164Phone || '+93 70 411 7413'} • Official Business
                    </p>
                  </div>
                </div>
              </div>

              {/* WhatsApp Chat Wallpaper Canvas */}
              <div className="flex-1 bg-[#ECE5DD] dark:bg-[#0B141A] p-2.5 overflow-y-auto rounded-b-2xl flex flex-col justify-between space-y-2 text-neutral-900 dark:text-neutral-100">
                {/* Encryption Notice Pill */}
                <div className="bg-[#FFF5C4] dark:bg-[#182229] text-[#54656F] dark:text-[#FFD279] px-2.5 py-1.5 rounded-lg text-[8.5px] text-center leading-tight shadow-2xs flex items-center justify-center gap-1">
                  <Lock className="w-2.5 h-2.5 shrink-0" />
                  <span>Messages are end-to-end encrypted. Verified JACXI Business account.</span>
                </div>

                <div className="space-y-2 flex flex-col">
                  {/* PDF Document Attachment Preview Bubble if enabled */}
                  {(attachReceipt || attachGatePass) && (
                    <div className="self-end w-[90%] bg-[#DCF8C6] dark:bg-[#005C4B] p-2 rounded-xl shadow-xs border border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-black/5 dark:bg-black/25">
                        <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center text-[9px] font-black shrink-0">
                          PDF
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold truncate">
                            {attachReceipt && attachGatePass
                              ? 'JACXI_Receipt_&_GatePass.pdf'
                              : attachReceipt
                                ? `JACXI_Shipment_Receipt_${activePayload.vin || 'PDF'}.pdf`
                                : `JACXI_Official_GatePass_${activePayload.vin || 'PDF'}.pdf`}
                          </p>
                          <p className="text-[8.5px] opacity-70">Signed Branded A4 Document • Verified</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Outgoing Message Bubble */}
                  <div className="self-end max-w-[94%] bg-[#DCF8C6] dark:bg-[#005C4B] p-2.5 rounded-2xl rounded-tr-xs shadow-sm border border-black/5 dark:border-white/5">
                    {/* Rich Link Preview Header */}
                    {messageBody.includes('http') && (
                      <div className="mb-2 p-2 rounded-lg bg-black/5 dark:bg-black/20 border-l-2 border-[#DDA853]">
                        <p className="text-[9.5px] font-bold text-[#075E54] dark:text-emerald-300 truncate">
                          JACXI Shipping — Live Cargo & Document Portal
                        </p>
                        <p className="text-[8.5px] opacity-75 truncate">
                          {activePayload.vehicleDetails || 'Vehicle'} • VIN: {activePayload.vin || 'Track Online'}
                        </p>
                      </div>
                    )}

                    <p
                      dir={isRtl ? 'rtl' : 'ltr'}
                      className="text-[10.5px] font-sans whitespace-pre-wrap leading-relaxed break-words"
                    >
                      {messageBody}
                    </p>

                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[8px] text-neutral-500 dark:text-neutral-300">Just now</span>
                      <span className="text-[9px] text-sky-500 font-bold">✓✓</span>
                    </div>

                    {/* Interactive WhatsApp Business Quick Action Buttons */}
                    <div className="mt-2 pt-1.5 border-t border-black/10 dark:border-white/10 flex flex-col gap-1">
                      <div className="text-center py-1 text-[9.5px] font-bold text-[#00A884] flex items-center justify-center gap-1">
                        <ExternalLink className="w-2.5 h-2.5" />
                        Track Live Shipment
                      </div>
                      <div className="text-center py-1 text-[9.5px] font-bold text-[#00A884] border-t border-black/5 dark:border-white/5 flex items-center justify-center gap-1">
                        <Phone className="w-2.5 h-2.5" />
                        Call JACXI Desk (+93 70 411 7413)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dispatch Feedback Banner */}
            {lastDispatchInfo && (
              <div
                className={`mt-3 w-full p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                  lastDispatchInfo.ok
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {lastDispatchInfo.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span className="truncate font-semibold">{lastDispatchInfo.mode}</span>
                </div>
                {lastDispatchInfo.waMeUrl && (
                  <a
                    href={lastDispatchInfo.waMeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold shrink-0 hover:opacity-90"
                  >
                    Open Chat
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-t border-[var(--border)] bg-[var(--background)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--panel)] transition-colors"
          >
            Close
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] hover:border-[var(--accent-gold)] transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Text
            </button>

            {channel === 'whatsapp' && (
              <button
                type="button"
                onClick={handleOpenWaMeDirect}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in WhatsApp App
              </button>
            )}

            <button
              type="button"
              disabled={sending}
              onClick={handleSend}
              className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl text-white hover:opacity-90 transition-opacity shadow-md disabled:opacity-50 ${
                channel === 'whatsapp' ? 'bg-emerald-600' : 'bg-[var(--accent-gold)]'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              {sending
                ? 'Dispatching...'
                : channel === 'whatsapp'
                  ? 'Send via WhatsApp Business'
                  : `Dispatch ${channel.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
