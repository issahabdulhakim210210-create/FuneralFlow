import Landing from '../screens/LandingScreen';
import AuthChoice from '../screens/AuthChoiceScreen';
import Login from '../screens/LoginScreen';
import Register from '../screens/RegisterScreen';
import PaymentGate from '../screens/PaymentGateScreen';
import PaymentComplete from '../screens/PaymentCompleteScreen';
import Dashboard from '../screens/DashboardScreen';
import Requests from '../screens/RequestsScreen';
import ServiceCatalog from '../screens/ServiceCatalogScreen';
import CreateService from '../screens/CreateServiceScreen';
import Sessions from '../screens/SessionsScreen';
import SessionDetail from '../screens/SessionDetailScreen';
import CreateRequest from '../screens/CreateRequestScreen';
import SelectService from '../screens/SelectServiceScreen';
import OrganizerProfile from '../screens/OrganizerProfileScreen';
import OrganizerAssistProfile from '../screens/OrganizerAssistProfileScreen';
import OrganizerEntry from '../screens/OrganizerEntryScreen';
import ForgotPassword from '../screens/ForgotPasswordScreen';
import Documents from '../screens/DocumentsScreen';
import Donations from '../screens/DonationsScreen';
import DonationRecord from '../screens/DonationRecordScreen';
import DonationHistory from '../screens/DonationHistoryScreen';
import GriefSupport from '../screens/GriefSupportScreen';
import Admin from '../screens/AdminScreen';
import AuditLog from '../screens/AuditLogScreen';
import FamilyPayments from '../screens/FamilyPaymentsScreen';
import FamilyProfile from '../screens/FamilyProfileScreen';
import SessionOverview from '../screens/SessionOverviewScreen';
import UserManagement from '../screens/UserManagementScreen';
import OrganizerAccounts from '../screens/OrganizerAccountsScreen';
import FamilyAccounts from '../screens/FamilyAccountsScreen';
import AccountDetail from '../screens/AccountDetailScreen';
export type RootStackParamList = {
  Landing: undefined;
  AuthChoice: {
    role: 'ORGANIZER' | 'FAMILY_MEMBER' | 'SUPER_ADMIN';
  };
  Login: { role?: string };
  ForgotPassword: { role?: string };
  Register: { role: string; method: string };
  PaymentGate: { purpose?: 'FAMILY_ACTIVATION' | 'ORGANIZER_REGISTRATION' | 'ORGANIZER_MONTHLY_SUBSCRIPTION' | 'INVOICE'; amount?: number; requestId?: string; title?: string; subtitle?: string } | undefined;
  PaymentComplete: { reference?: string; paid?: string };
  Dashboard: undefined;
  Requests: undefined;
  ServiceCatalog: undefined;
  Sessions: undefined;
  SessionDetail: { id: string; collectorName?: string; collectorIdentifier?: string };
  SessionOverview: { id?: string } | undefined;
  OrganizerAssistProfile: { id?: string; collectorName: string; collectorIdentifier: string };
  Donations: { id?: string } | undefined;
  DonationHistory: { id?: string; collectorName?: string; collectorIdentifier?: string } | undefined;
  CreateService: undefined;
  OrganizerProfile: undefined;
  OrganizerEntry: undefined;
  CreateRequest: { organizerIdentifier?: string; selectedServiceIds?: string[] } | undefined;
  SelectService: { organizerIdentifier?: string; selectedServiceIds?: string[] } | undefined;
  Documents: { id?: string } | undefined;
  DonationRecord: { id?: string; donationId?: string; collectorName?: string; collectorIdentifier?: string } | undefined;
  GriefSupport: undefined;
  Admin: undefined;
  UserManagement: undefined;
  OrganizerAccounts: undefined;
  FamilyAccounts: undefined;
  AccountDetail: { id: string; role: 'ORGANIZER' | 'FAMILY_MEMBER' };
  FamilyProfile: undefined;
  AuditLog: undefined;
  FamilyPayments: undefined;
};

type RouteConfig = {
  name: keyof RootStackParamList;
  component: React.ComponentType<any>;
  protected?: boolean;
};

export const routes: RouteConfig[] = [
  { name: 'Landing', component: Landing },
  { name: 'AuthChoice', component: AuthChoice },
  { name: 'Login', component: Login },
  { name: 'ForgotPassword', component: ForgotPassword },
  { name: 'Register', component: Register },
  { name: 'PaymentGate', component: PaymentGate, protected: true },
  { name: 'PaymentComplete', component: PaymentComplete, protected: true },
  { name: 'Dashboard', component: Dashboard, protected: true },
  {name: 'FamilyProfile', component: FamilyProfile, protected: true },
  { name: 'OrganizerEntry', component: OrganizerEntry },
  { name: 'OrganizerAssistProfile', component: OrganizerAssistProfile },
  { name: 'Requests', component: Requests, protected: true },
  { name: 'ServiceCatalog', component: ServiceCatalog, protected: true },
  { name: 'CreateService', component: CreateService, protected: true },
  { name: 'Sessions', component: Sessions, protected: true },
  { name: 'SessionDetail', component: SessionDetail },
  { name: 'SessionOverview', component: SessionOverview, protected: true },
  { name: 'CreateRequest', component: CreateRequest, protected: true },
  { name: 'SelectService', component: SelectService, protected: true },
  { name: 'Documents', component: Documents, protected: true },
  { name: 'Donations', component: Donations, protected: true },
  { name: 'DonationRecord', component: DonationRecord },
  { name: 'DonationHistory', component: DonationHistory },
  { name: 'GriefSupport', component: GriefSupport, protected: true },
  { name: 'Admin', component: Admin, protected: true },
  { name: 'UserManagement', component: UserManagement, protected: true },
  { name: 'OrganizerAccounts', component: OrganizerAccounts, protected: true },
  { name: 'FamilyAccounts', component: FamilyAccounts, protected: true },
  { name: 'AccountDetail', component: AccountDetail, protected: true },
  { name: 'AuditLog', component: AuditLog, protected: true },
  { name: 'FamilyPayments', component: FamilyPayments, protected: true },
  { name: 'OrganizerProfile', component: OrganizerProfile, protected: true },
];
