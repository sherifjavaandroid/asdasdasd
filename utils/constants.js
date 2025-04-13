/**
 * ثوابت المشروع
 */

// أنواع تطبيقات الموبايل المدعومة
const MOBILE_APP_TYPES = {
    FLUTTER: 'flutter',
    XAMARIN: 'xamarin',
    NATIVE_ANDROID: 'nativeAndroid',
    NATIVE_IOS: 'nativeIOS',
    REACT_NATIVE: 'reactNative',
};

// فئات المخاطر الرئيسية
const RISK_CATEGORIES = {
    SECURITY: 'security',
    PERFORMANCE: 'performance',
    MEMORY: 'memory',
    BATTERY: 'battery',
};

// مستويات شدة المخاطر
const SEVERITY_LEVELS = {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    INFO: 'info',
};

// مخاطر الأمان المستهدفة
const SECURITY_RISKS = {
    M1_IMPROPER_CREDENTIAL_USAGE: 'M1: Improper Credential Usage',
    M2_INADEQUATE_SUPPLY_CHAIN: 'M2: Inadequate Supply Chain Security',
    M3_INSECURE_AUTH: 'M3: Insecure Authentication/Authorization',
    M4_INSUFFICIENT_VALIDATION: 'M4: Insufficient Input/Output Validation',
    M5_INSECURE_COMMUNICATION: 'M5: Insecure Communication',
    M6_INADEQUATE_PRIVACY: 'M6: Inadequate Privacy Controls',
    M7_INSUFFICIENT_BINARY_PROTECTIONS: 'M7: Insufficient Binary Protections',
    M8_SECURITY_MISCONFIGURATION: 'M8: Security Misconfiguration',
    M9_INSECURE_DATA_STORAGE: 'M9: Insecure Data Storage',
    M10_INSUFFICIENT_CRYPTOGRAPHY: 'M10: Insufficient Cryptography',
    DATA_LEAKAGE: 'Data Leakage',
    HARDCODED_SECRETS: 'Hardcoded Secrets',
    INSECURE_ACCESS_CONTROL: 'Insecure Access Control',
    PATH_TRAVERSAL: 'Path Overwrite and Path Traversal',
    UNPROTECTED_ENDPOINTS: 'Unprotected Endpoints',
    UNSAFE_SHARING: 'Unsafe Sharing',
};

// مخاطر تطبيقات المحمول
const MOBILE_RISKS = {
    M1_IMPROPER_PLATFORM_USAGE: 'M1: Improper Platform Usage',
    M2_INSECURE_DATA_STORAGE: 'M2: Insecure Data Storage',
    M3_INSECURE_COMMUNICATION: 'M3: Insecure Communication',
    M4_INSECURE_AUTHENTICATION: 'M4: Insecure Authentication',
    M5_INSUFFICIENT_CRYPTOGRAPHY: 'M5: Insufficient Cryptography',
    M6_INSECURE_AUTHORIZATION: 'M6: Insecure Authorization',
    M7_CLIENT_CODE_QUALITY: 'M7: Client Code Quality',
    M8_CODE_TAMPERING: 'M8: Code Tampering',
    M9_REVERSE_ENGINEERING: 'M9: Reverse Engineering',
    M10_EXTRANEOUS_FUNCTIONALITY: 'M10: Extraneous Functionality',
};

// مخاطر تطبيقات المحمول 2014
const MOBILE_RISKS_2014 = {
    M1_WEAK_SERVER_SIDE_CONTROLS: 'M1: Weak Server Side Controls',
    M2_INSECURE_DATA_STORAGE: 'M2: Insecure Data Storage',
    M3_INSUFFICIENT_TRANSPORT_PROTECTION: 'M3: Insufficient Transport Layer Protection',
    M4_UNINTENDED_DATA_LEAKAGE: 'M4: Unintended Data Leakage',
    M5_POOR_AUTHORIZATION: 'M5: Poor Authorization and Authentication',
    M6_BROKEN_CRYPTOGRAPHY: 'M6: Broken Cryptography',
    M7_CLIENT_SIDE_INJECTION: 'M7: Client Side Injection',
    M8_SECURITY_DECISIONS_UNTRUSTED_INPUTS: 'M8: Security Decisions Via Untrusted Inputs',
    M9_IMPROPER_SESSION_HANDLING: 'M9: Improper Session Handling',
    M10_LACK_BINARY_PROTECTIONS: 'M10: Lack of Binary Protections',
};

// التهديدات المتعلقة بتطبيقات المحمول
const APP_THREATS = {
    APP0_EAVESDROPPING: 'APP-0: Eavesdropping on Unencrypted App Traffic',
    APP1_MAN_IN_THE_MIDDLE: 'APP-1: Man-in-the-middle Attack on Server Authentication',
    APP2_SENSITIVE_INFO_EXPOSURE: 'APP-2: Sensitive Information Exposure',
    APP3_SENSITIVE_INFO_LOGS: 'APP-3: Sensitive Information in System Logs',
    // ... يمكنك إضافة باقي التهديدات هنا كما هو مذكور في المتطلبات
};

// فئات تحليل الأداء
const PERFORMANCE_CATEGORIES = {
    UI_RESPONSIVENESS: 'UI Responsiveness',
    NETWORK_EFFICIENCY: 'Network Efficiency',
    COMPUTATION_EFFICIENCY: 'Computation Efficiency',
    RESOURCE_MANAGEMENT: 'Resource Management',
    STARTUP_TIME: 'Startup Time',
};

// فئات تحليل استخدام الذاكرة
const MEMORY_CATEGORIES = {
    MEMORY_LEAKS: 'Memory Leaks',
    EXCESSIVE_MEMORY_USAGE: 'Excessive Memory Usage',
    INEFFICIENT_MEMORY_ALLOCATION: 'Inefficient Memory Allocation',
    MEMORY_FRAGMENTATION: 'Memory Fragmentation',
};

// فئات تحليل استهلاك البطارية
const BATTERY_CATEGORIES = {
    BACKGROUND_PROCESSES: 'Background Processes',
    LOCATION_SERVICES: 'Location Services',
    NETWORK_OPERATIONS: 'Network Operations',
    SENSOR_USAGE: 'Sensor Usage',
    WAKE_LOCKS: 'Wake Locks',
    ANIMATIONS_AND_GRAPHICS: 'Animations and Graphics',
};

// تصدير جميع الثوابت
module.exports = {
    MOBILE_APP_TYPES,
    RISK_CATEGORIES,
    SEVERITY_LEVELS,
    SECURITY_RISKS,
    MOBILE_RISKS,
    MOBILE_RISKS_2014,
    APP_THREATS,
    PERFORMANCE_CATEGORIES,
    MEMORY_CATEGORIES,
    BATTERY_CATEGORIES,
};