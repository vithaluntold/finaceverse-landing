// ============================================
// PARTNER PORTAL - Type Definitions
// Partner, Reseller, Affiliate, White-Label
// ============================================

export type PartnerTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export type PartnerStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type CommissionType = 'percentage' | 'flat' | 'tiered';
export type PayoutFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed';

// ============================================
// PARTNER
// ============================================

export interface Partner {
  id: string;
  tenantId: string;
  partnerType: 'reseller' | 'affiliate' | 'referral' | 'white_label';
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  website?: string;
  tier: PartnerTier;
  status: PartnerStatus;
  commissionRate: number; // Percentage (e.g., 20 for 20%)
  commissionType: CommissionType;
  payoutFrequency: PayoutFrequency;
  payoutMethod: 'bank_transfer' | 'paypal' | 'stripe' | 'razorpay';
  payoutDetails: Record<string, unknown>;
  totalEarnings: number;
  totalPaidOut: number;
  pendingPayout: number;
  customerId: string; // Their customer ID in billing system
  referralCode: string; // Unique referral code
  onboardedAt: Date;
  lastPayoutAt?: Date;
  contractStartDate: Date;
  contractEndDate?: Date;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// RESELLER (Extends Partner)
// ============================================

export interface Reseller extends Partner {
  partnerType: 'reseller';
  resellerConfig: {
    canCreateCustomers: boolean;
    canManageBilling: boolean;
    canSetPricing: boolean;
    discountAuthority: number; // Max discount % they can offer
    territoryRestriction?: string[]; // Country codes
    productRestrictions?: string[]; // Product IDs they can sell
    minimumOrderValue?: number;
    creditLimit?: number;
  };
  customersManaged: number;
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
}

// ============================================
// AFFILIATE
// ============================================

export interface Affiliate extends Partner {
  partnerType: 'affiliate';
  affiliateConfig: {
    cookieDuration: number; // Days
    firstPurchaseOnly: boolean;
    recurringCommission: boolean;
    recurringMonths?: number; // How many months to pay recurring
    productRestrictions?: string[];
    minimumPurchaseValue?: number;
  };
  totalReferrals: number;
  convertedReferrals: number;
  conversionRate: number; // Percentage
  averageOrderValue: number;
}

// ============================================
// WHITE-LABEL PARTNER
// ============================================

export interface WhiteLabelPartner extends Partner {
  partnerType: 'white_label';
  whiteLabelConfig: WhiteLabelConfig;
  customersOnboarded: number;
  brandedDomain?: string;
  sslCertificate?: {
    issuer: string;
    expiresAt: Date;
  };
}

export interface WhiteLabelConfig {
  id: string;
  partnerId: string;
  brandName: string;
  logo: {
    primary: string; // URL
    secondary?: string;
    favicon?: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  domain?: string; // Custom domain
  emailDomain?: string; // Custom email sender domain
  emailTemplates: {
    welcome?: string;
    invoice?: string;
    passwordReset?: string;
  };
  supportEmail: string;
  supportPhone?: string;
  legalEntity: string;
  termsUrl?: string;
  privacyUrl?: string;
  hideFinACEverseBranding: boolean;
  customFeatures?: {
    customDashboard: boolean;
    customReports: boolean;
    apiAccess: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// PARTNER TIER
// ============================================

export interface PartnerTierConfig {
  tier: PartnerTier;
  name: string;
  minimumMonthlyRevenue: number;
  minimumCustomers: number;
  commissionRate: number; // Base commission %
  bonusCommissionRate?: number; // Extra % for exceeding targets
  benefits: string[];
  supportLevel: 'standard' | 'priority' | 'dedicated';
  dedicatedAccountManager: boolean;
  coMarketingBudget?: number; // Monthly budget for co-marketing
  customIntegrations: boolean;
  apiRateLimit: number; // Requests per hour
  requirements: {
    certificationRequired: boolean;
    minimumTeamSize?: number;
    caseStudiesRequired?: number;
  };
}

// ============================================
// COMMISSION & PAYOUTS
// ============================================

export interface Commission {
  id: string;
  partnerId: string;
  customerId: string;
  subscriptionId?: string;
  invoiceId?: string;
  type: 'signup' | 'recurring' | 'upsell' | 'renewal' | 'referral';
  amount: number; // Gross amount
  commissionRate: number;
  commissionAmount: number; // What partner earns
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: string;
  approvedAt?: Date;
  paidAt?: Date;
  payoutId?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payout {
  id: string;
  partnerId: string;
  amount: number;
  currency: string;
  method: 'bank_transfer' | 'paypal' | 'stripe' | 'razorpay';
  status: PayoutStatus;
  commissionIds: string[]; // Commissions included in this payout
  periodStart: Date;
  periodEnd: Date;
  initiatedBy: string;
  initiatedAt: Date;
  processedAt?: Date;
  transactionId?: string; // External payment provider ID
  failureReason?: string;
  retryCount: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// REFERRAL TRACKING
// ============================================

export interface Referral {
  id: string;
  partnerId: string;
  referralCode: string;
  visitorId?: string;
  sessionId?: string;
  landingUrl: string;
  referrerUrl?: string;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  converted: boolean;
  customerId?: string;
  conversionValue?: number;
  conversionDate?: Date;
  commissionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ============================================
// PARTNER PERFORMANCE METRICS
// ============================================

export interface PartnerMetrics {
  partnerId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalReferrals: number;
    convertedReferrals: number;
    conversionRate: number;
    totalRevenue: number;
    totalCommissions: number;
    averageOrderValue: number;
    activeCustomers: number;
    churnedCustomers: number;
    netPromoterScore?: number;
    customersAtRisk?: number;
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    sales: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    revenue: number;
    subscriptionStatus: string;
  }>;
  rankInTier: number;
  nextTierProgress?: {
    currentMetric: number;
    targetMetric: number;
    percentage: number;
  };
  calculatedAt: Date;
}
