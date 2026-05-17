/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: string; output: string };
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: any; output: any };
};

export type ActivityAction =
  | "USER_INVITATION_REVOKED"
  | "USER_INVITED"
  | "USER_ROLE_CHANGED"
  | "USER_UPDATED_PROFILE";

export type ActivityLogModel = {
  __typename?: "ActivityLogModel";
  action: ActivityAction;
  createdAt: Scalars["DateTime"]["output"];
  entityId?: Maybe<Scalars["String"]["output"]>;
  entityType: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  metadata?: Maybe<Scalars["JSON"]["output"]>;
  tenantId: Scalars["String"]["output"];
  userId?: Maybe<Scalars["String"]["output"]>;
};

export type AddInterviewInput = {
  interviewerUserId?: InputMaybe<Scalars["String"]["input"]>;
  round: Scalars["Int"]["input"];
  scheduledAt: Scalars["DateTime"]["input"];
};

export type AddOfferInput = {
  amount?: InputMaybe<Scalars["Float"]["input"]>;
  currency?: InputMaybe<Scalars["String"]["input"]>;
  startDate?: InputMaybe<Scalars["DateTime"]["input"]>;
};

export type AddTeamMemberInput = {
  role: TeamRole;
  userId: Scalars["ID"]["input"];
};

export type AdvanceStageInput = {
  note?: InputMaybe<Scalars["String"]["input"]>;
  stage: ApplicationStageType;
};

export type ApplicationStageModel = {
  __typename?: "ApplicationStageModel";
  applicationId: Scalars["String"]["output"];
  enteredAt: Scalars["DateTime"]["output"];
  enteredById: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  note?: Maybe<Scalars["String"]["output"]>;
  stage: ApplicationStageType;
  tenantId: Scalars["String"]["output"];
};

export type ApplicationStageType =
  | "APPLIED"
  | "CV_SENT"
  | "INTERVIEW"
  | "LONGLIST"
  | "OFFER"
  | "PLACEMENT"
  | "REJECTED";

export type AssignRoleInput = {
  roleId: Scalars["String"]["input"];
  userId: Scalars["String"]["input"];
};

export type CandidateConnection = {
  __typename?: "CandidateConnection";
  edges: Array<CandidateEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type CandidateEdge = {
  __typename?: "CandidateEdge";
  cursor: Scalars["String"]["output"];
  node: CandidateModel;
};

export type CandidateFilterInput = {
  currentCompany?: InputMaybe<Scalars["String"]["input"]>;
  currentTitle?: InputMaybe<Scalars["String"]["input"]>;
  location?: InputMaybe<Scalars["String"]["input"]>;
  /** Free-text match on name, email, company, title */
  search?: InputMaybe<Scalars["String"]["input"]>;
  status?: InputMaybe<CandidateStatus>;
};

export type CandidateModel = {
  __typename?: "CandidateModel";
  createdAt: Scalars["DateTime"]["output"];
  currentCompany?: Maybe<Scalars["String"]["output"]>;
  currentTitle?: Maybe<Scalars["String"]["output"]>;
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  email?: Maybe<Scalars["String"]["output"]>;
  firstName: Scalars["String"]["output"];
  githubUrl?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  lastName: Scalars["String"]["output"];
  linkedinUrl?: Maybe<Scalars["String"]["output"]>;
  location?: Maybe<Scalars["String"]["output"]>;
  notes?: Maybe<Scalars["String"]["output"]>;
  ownerUserId?: Maybe<Scalars["String"]["output"]>;
  phone?: Maybe<Scalars["String"]["output"]>;
  status: CandidateStatus;
  tenantId: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type CandidateSortField = "CREATED_AT" | "NAME" | "UPDATED_AT";

export type CandidateStatus = "ACTIVE" | "BLACKLISTED" | "INACTIVE" | "PLACED";

export type ClientContactModel = {
  __typename?: "ClientContactModel";
  clientId: Scalars["String"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  email?: Maybe<Scalars["String"]["output"]>;
  firstName: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  isPrimary: Scalars["Boolean"]["output"];
  lastName: Scalars["String"]["output"];
  ownerUserId?: Maybe<Scalars["String"]["output"]>;
  phone?: Maybe<Scalars["String"]["output"]>;
  tenantId: Scalars["String"]["output"];
  title?: Maybe<Scalars["String"]["output"]>;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ClientModel = {
  __typename?: "ClientModel";
  activeJobCount: Scalars["Float"]["output"];
  address?: Maybe<Scalars["String"]["output"]>;
  bdUserId?: Maybe<Scalars["String"]["output"]>;
  contacts: Array<ClientContactModel>;
  createdAt: Scalars["DateTime"]["output"];
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  industry?: Maybe<Scalars["String"]["output"]>;
  jobs: Array<JobModel>;
  name: Scalars["String"]["output"];
  parentId?: Maybe<Scalars["String"]["output"]>;
  phone?: Maybe<Scalars["String"]["output"]>;
  status: ClientStatus;
  tenantId: Scalars["String"]["output"];
  totalJobCount: Scalars["Float"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
  website?: Maybe<Scalars["String"]["output"]>;
};

export type ClientStatus = "ACTIVE" | "INACTIVE" | "PROSPECT";

export type CompleteInterviewInput = {
  feedback?: InputMaybe<Scalars["String"]["input"]>;
  rating?: InputMaybe<Scalars["Int"]["input"]>;
};

export type CreateCandidateInput = {
  currentCompany?: InputMaybe<Scalars["String"]["input"]>;
  currentTitle?: InputMaybe<Scalars["String"]["input"]>;
  email?: InputMaybe<Scalars["String"]["input"]>;
  firstName: Scalars["String"]["input"];
  githubUrl?: InputMaybe<Scalars["String"]["input"]>;
  lastName: Scalars["String"]["input"];
  linkedinUrl?: InputMaybe<Scalars["String"]["input"]>;
  location?: InputMaybe<Scalars["String"]["input"]>;
  notes?: InputMaybe<Scalars["String"]["input"]>;
  ownerUserId?: InputMaybe<Scalars["String"]["input"]>;
  phone?: InputMaybe<Scalars["String"]["input"]>;
  status?: InputMaybe<CandidateStatus>;
};

export type CreateClientContactInput = {
  clientId: Scalars["String"]["input"];
  email?: InputMaybe<Scalars["String"]["input"]>;
  firstName: Scalars["String"]["input"];
  isPrimary?: InputMaybe<Scalars["Boolean"]["input"]>;
  lastName: Scalars["String"]["input"];
  phone?: InputMaybe<Scalars["String"]["input"]>;
  title?: InputMaybe<Scalars["String"]["input"]>;
};

export type CreateClientInput = {
  address?: InputMaybe<Scalars["String"]["input"]>;
  bdUserId?: InputMaybe<Scalars["String"]["input"]>;
  industry?: InputMaybe<Scalars["String"]["input"]>;
  name: Scalars["String"]["input"];
  parentId?: InputMaybe<Scalars["String"]["input"]>;
  phone?: InputMaybe<Scalars["String"]["input"]>;
  website?: InputMaybe<Scalars["String"]["input"]>;
};

export type CreateJobApplicationInput = {
  candidateId: Scalars["String"]["input"];
  jobId: Scalars["String"]["input"];
  ownerUserId?: InputMaybe<Scalars["String"]["input"]>;
  source?: InputMaybe<Scalars["String"]["input"]>;
};

export type CreateJobInput = {
  assignedToId?: InputMaybe<Scalars["String"]["input"]>;
  clientId: Scalars["String"]["input"];
  closeDate?: InputMaybe<Scalars["DateTime"]["input"]>;
  description?: InputMaybe<Scalars["String"]["input"]>;
  openDate?: InputMaybe<Scalars["DateTime"]["input"]>;
  ownerUserId?: InputMaybe<Scalars["String"]["input"]>;
  priority?: InputMaybe<JobPriority>;
  status?: InputMaybe<JobStatus>;
  title: Scalars["String"]["input"];
};

export type CreateRoleInput = {
  description?: InputMaybe<Scalars["String"]["input"]>;
  name: Scalars["String"]["input"];
  /** Permission strings e.g. ['candidate:view_all', 'job:create'] */
  permissions: Array<Scalars["String"]["input"]>;
};

export type CreateTeamInput = {
  kind: TeamKind;
  name: Scalars["String"]["input"];
  parentId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type CreateTenantInput = {
  name: Scalars["String"]["input"];
  slug: Scalars["String"]["input"];
};

export type InterviewModel = {
  __typename?: "InterviewModel";
  applicationId: Scalars["String"]["output"];
  completedAt?: Maybe<Scalars["DateTime"]["output"]>;
  createdAt: Scalars["DateTime"]["output"];
  feedback?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  interviewerUserId?: Maybe<Scalars["String"]["output"]>;
  rating?: Maybe<Scalars["Float"]["output"]>;
  round: Scalars["Float"]["output"];
  scheduledAt: Scalars["DateTime"]["output"];
  tenantId: Scalars["String"]["output"];
};

export type InviteUserInput = {
  email: Scalars["String"]["input"];
  firstName: Scalars["String"]["input"];
  lastName: Scalars["String"]["input"];
  /** Role names to assign on invite */
  roleNames?: InputMaybe<Array<Scalars["String"]["input"]>>;
};

export type JobApplicationModel = {
  __typename?: "JobApplicationModel";
  candidateId: Scalars["String"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  interviews: Array<InterviewModel>;
  isActive: Scalars["Boolean"]["output"];
  jobId: Scalars["String"]["output"];
  matchScore?: Maybe<Scalars["Float"]["output"]>;
  maxStage: ApplicationStageType;
  offers: Array<OfferModel>;
  ownerUserId?: Maybe<Scalars["String"]["output"]>;
  source?: Maybe<Scalars["String"]["output"]>;
  stages: Array<ApplicationStageModel>;
  tenantId: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type JobModel = {
  __typename?: "JobModel";
  applicationCount: Scalars["Float"]["output"];
  assignedToId?: Maybe<Scalars["String"]["output"]>;
  client: ClientModel;
  clientId: Scalars["String"]["output"];
  closeDate?: Maybe<Scalars["DateTime"]["output"]>;
  createdAt: Scalars["DateTime"]["output"];
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  description?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  interviewCount: Scalars["Float"]["output"];
  offerCount: Scalars["Float"]["output"];
  openDate?: Maybe<Scalars["DateTime"]["output"]>;
  ownerUserId?: Maybe<Scalars["String"]["output"]>;
  placementCount: Scalars["Float"]["output"];
  priority: JobPriority;
  status: JobStatus;
  tenantId: Scalars["String"]["output"];
  title: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type JobPriority = "HIGH" | "LOW" | "MEDIUM" | "URGENT";

export type JobStatus = "CLOSED" | "FILLED" | "ON_HOLD" | "OPEN";

export type Mutation = {
  __typename?: "Mutation";
  /** Schedule an interview for this application */
  addInterview: InterviewModel;
  /** Add an offer to an application */
  addOffer: OfferModel;
  /** Add a member to a team */
  addTeamMember: TeamMemberModel;
  /** Advance application to a new pipeline stage */
  advanceApplicationStage: JobApplicationModel;
  /** Assign a role to a user */
  assignRole: UserModel;
  /** Record interview outcome */
  completeInterview: InterviewModel;
  /** Create a new candidate */
  createCandidate: CandidateModel;
  /** Create a new client */
  createClient: ClientModel;
  /** Add a contact to a client */
  createClientContact: ClientContactModel;
  /** Create a new job */
  createJob: JobModel;
  /** Create a new job application */
  createJobApplication: JobApplicationModel;
  /** Create a tenant-scoped custom role */
  createRole: RoleModel;
  /** Create a new team */
  createTeam: TeamModel;
  /** Create a new tenant; the caller becomes its first member */
  createTenant: TenantModel;
  /** Deactivate a user — revokes all sessions */
  deactivateUser: UserModel;
  /** Soft-delete a candidate */
  deleteCandidate: CandidateModel;
  /** Soft-delete a client */
  deleteClient: ClientModel;
  /** Remove a client contact */
  deleteClientContact: ClientContactModel;
  /** Soft-delete a job */
  deleteJob: JobModel;
  /** Delete a custom role (built-ins cannot be deleted) */
  deleteRole: RoleModel;
  /** Soft-delete a team */
  deleteTeam: TeamModel;
  /** Invite a new user to the tenant */
  inviteUser: UserModel;
  /** Reactivate a previously deactivated user */
  reactivateUser: UserModel;
  /** Remove a role from a user */
  removeRole: UserModel;
  /** Remove a member from a team */
  removeTeamMember: TeamMemberModel;
  /** Update a candidate */
  updateCandidate: CandidateModel;
  /** Update a client */
  updateClient: ClientModel;
  /** Update a job */
  updateJob: JobModel;
  /** Update own profile */
  updateMyProfile: UserModel;
  /** Update a custom role (built-ins are read-only) */
  updateRole: RoleModel;
  /** Update a team */
  updateTeam: TeamModel;
  /** Update a team member's role */
  updateTeamMemberRole: TeamMemberModel;
};

export type MutationAddInterviewArgs = {
  applicationId: Scalars["ID"]["input"];
  input: AddInterviewInput;
};

export type MutationAddOfferArgs = {
  applicationId: Scalars["ID"]["input"];
  input: AddOfferInput;
};

export type MutationAddTeamMemberArgs = {
  input: AddTeamMemberInput;
  teamId: Scalars["ID"]["input"];
};

export type MutationAdvanceApplicationStageArgs = {
  id: Scalars["ID"]["input"];
  input: AdvanceStageInput;
};

export type MutationAssignRoleArgs = {
  input: AssignRoleInput;
};

export type MutationCompleteInterviewArgs = {
  input: CompleteInterviewInput;
  interviewId: Scalars["ID"]["input"];
};

export type MutationCreateCandidateArgs = {
  input: CreateCandidateInput;
};

export type MutationCreateClientArgs = {
  input: CreateClientInput;
};

export type MutationCreateClientContactArgs = {
  input: CreateClientContactInput;
};

export type MutationCreateJobArgs = {
  input: CreateJobInput;
};

export type MutationCreateJobApplicationArgs = {
  input: CreateJobApplicationInput;
};

export type MutationCreateRoleArgs = {
  input: CreateRoleInput;
};

export type MutationCreateTeamArgs = {
  input: CreateTeamInput;
};

export type MutationCreateTenantArgs = {
  input: CreateTenantInput;
};

export type MutationDeactivateUserArgs = {
  userId: Scalars["ID"]["input"];
};

export type MutationDeleteCandidateArgs = {
  id: Scalars["ID"]["input"];
};

export type MutationDeleteClientArgs = {
  id: Scalars["ID"]["input"];
};

export type MutationDeleteClientContactArgs = {
  id: Scalars["ID"]["input"];
};

export type MutationDeleteJobArgs = {
  id: Scalars["ID"]["input"];
};

export type MutationDeleteRoleArgs = {
  id: Scalars["ID"]["input"];
};

export type MutationDeleteTeamArgs = {
  id: Scalars["ID"]["input"];
};

export type MutationInviteUserArgs = {
  input: InviteUserInput;
};

export type MutationReactivateUserArgs = {
  userId: Scalars["ID"]["input"];
};

export type MutationRemoveRoleArgs = {
  input: RemoveRoleInput;
};

export type MutationRemoveTeamMemberArgs = {
  teamId: Scalars["ID"]["input"];
  userId: Scalars["ID"]["input"];
};

export type MutationUpdateCandidateArgs = {
  id: Scalars["ID"]["input"];
  input: UpdateCandidateInput;
};

export type MutationUpdateClientArgs = {
  id: Scalars["ID"]["input"];
  input: UpdateClientInput;
};

export type MutationUpdateJobArgs = {
  id: Scalars["ID"]["input"];
  input: UpdateJobInput;
};

export type MutationUpdateMyProfileArgs = {
  input: UpdateProfileInput;
};

export type MutationUpdateRoleArgs = {
  id: Scalars["ID"]["input"];
  input: UpdateRoleInput;
};

export type MutationUpdateTeamArgs = {
  id: Scalars["ID"]["input"];
  input: UpdateTeamInput;
};

export type MutationUpdateTeamMemberRoleArgs = {
  input: UpdateTeamMemberInput;
  teamId: Scalars["ID"]["input"];
  userId: Scalars["ID"]["input"];
};

export type OfferModel = {
  __typename?: "OfferModel";
  amount?: Maybe<Scalars["Float"]["output"]>;
  applicationId: Scalars["String"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  currency?: Maybe<Scalars["String"]["output"]>;
  declineReason?: Maybe<Scalars["String"]["output"]>;
  declinedAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  signedAt?: Maybe<Scalars["DateTime"]["output"]>;
  startDate?: Maybe<Scalars["DateTime"]["output"]>;
  tenantId: Scalars["String"]["output"];
};

export type PageInfo = {
  __typename?: "PageInfo";
  endCursor?: Maybe<Scalars["String"]["output"]>;
  hasNextPage: Scalars["Boolean"]["output"];
  hasPreviousPage: Scalars["Boolean"]["output"];
  startCursor?: Maybe<Scalars["String"]["output"]>;
};

export type Query = {
  __typename?: "Query";
  /** Recent activity log entries */
  activityLog: Array<ActivityLogModel>;
  /** Get a candidate by ID */
  candidate: CandidateModel;
  /** List candidates visible to the current user */
  candidates: CandidateConnection;
  /** Get a client by ID */
  client: ClientModel;
  /** List all clients in the tenant */
  clients: Array<ClientModel>;
  /** Get a job by ID */
  job: JobModel;
  /** Get a job application by ID */
  jobApplication: JobApplicationModel;
  /** List applications for a job */
  jobApplications: Array<JobApplicationModel>;
  /** List all jobs in the tenant */
  jobs: Array<JobModel>;
  /** Current user's profile */
  me: UserModel;
  /** All tenants the current auth identity belongs to */
  myTenants: Array<TenantModel>;
  ping: Scalars["String"]["output"];
  /** Single role by ID */
  role: RoleModel;
  /** All roles visible to this tenant (built-ins + custom) */
  roles: Array<RoleModel>;
  /** Get a team by ID */
  team: TeamModel;
  /** List all teams in the tenant */
  teams: Array<TeamModel>;
  /** All team members in this tenant */
  users: Array<UserModel>;
};

export type QueryActivityLogArgs = {
  limit?: Scalars["Int"]["input"];
  offset?: Scalars["Int"]["input"];
};

export type QueryCandidateArgs = {
  id: Scalars["ID"]["input"];
};

export type QueryCandidatesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  filter?: InputMaybe<CandidateFilterInput>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  sortBy?: InputMaybe<CandidateSortField>;
  sortOrder?: InputMaybe<SortOrder>;
};

export type QueryClientArgs = {
  id: Scalars["ID"]["input"];
};

export type QueryJobArgs = {
  id: Scalars["ID"]["input"];
};

export type QueryJobApplicationArgs = {
  id: Scalars["ID"]["input"];
};

export type QueryJobApplicationsArgs = {
  jobId: Scalars["ID"]["input"];
};

export type QueryRoleArgs = {
  id: Scalars["ID"]["input"];
};

export type QueryTeamArgs = {
  id: Scalars["ID"]["input"];
};

export type RemoveRoleInput = {
  roleId: Scalars["String"]["input"];
  userId: Scalars["String"]["input"];
};

export type RoleModel = {
  __typename?: "RoleModel";
  builtin: Scalars["Boolean"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  description?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  name: Scalars["String"]["output"];
  permissions: Array<Scalars["String"]["output"]>;
  shortId: Scalars["Int"]["output"];
  /** null for built-in roles */
  tenantId?: Maybe<Scalars["String"]["output"]>;
  updatedAt: Scalars["DateTime"]["output"];
};

export type SortOrder = "ASC" | "DESC";

export type TeamKind = "BUSINESS" | "OTHER" | "PRACTICE" | "REGION";

export type TeamMemberModel = {
  __typename?: "TeamMemberModel";
  joinedAt: Scalars["DateTime"]["output"];
  role: TeamRole;
  teamId: Scalars["ID"]["output"];
  userId: Scalars["ID"]["output"];
};

export type TeamModel = {
  __typename?: "TeamModel";
  /** Direct child teams */
  children?: Maybe<Array<TeamModel>>;
  createdAt: Scalars["DateTime"]["output"];
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  kind: TeamKind;
  /** Members of this team */
  members: Array<TeamMemberModel>;
  name: Scalars["String"]["output"];
  /** Parent team */
  parent?: Maybe<TeamModel>;
  parentId?: Maybe<Scalars["ID"]["output"]>;
  shortId: Scalars["Int"]["output"];
  tenantId: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type TeamRole = "LEAD" | "MEMBER";

export type TenantModel = {
  __typename?: "TenantModel";
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  name: Scalars["String"]["output"];
  slug: Scalars["String"]["output"];
};

export type UpdateCandidateInput = {
  currentCompany?: InputMaybe<Scalars["String"]["input"]>;
  currentTitle?: InputMaybe<Scalars["String"]["input"]>;
  email?: InputMaybe<Scalars["String"]["input"]>;
  firstName?: InputMaybe<Scalars["String"]["input"]>;
  githubUrl?: InputMaybe<Scalars["String"]["input"]>;
  lastName?: InputMaybe<Scalars["String"]["input"]>;
  linkedinUrl?: InputMaybe<Scalars["String"]["input"]>;
  location?: InputMaybe<Scalars["String"]["input"]>;
  notes?: InputMaybe<Scalars["String"]["input"]>;
  ownerUserId?: InputMaybe<Scalars["String"]["input"]>;
  phone?: InputMaybe<Scalars["String"]["input"]>;
  status?: InputMaybe<CandidateStatus>;
};

export type UpdateClientInput = {
  address?: InputMaybe<Scalars["String"]["input"]>;
  bdUserId?: InputMaybe<Scalars["String"]["input"]>;
  industry?: InputMaybe<Scalars["String"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  parentId?: InputMaybe<Scalars["String"]["input"]>;
  phone?: InputMaybe<Scalars["String"]["input"]>;
  status?: InputMaybe<ClientStatus>;
  website?: InputMaybe<Scalars["String"]["input"]>;
};

export type UpdateJobInput = {
  assignedToId?: InputMaybe<Scalars["String"]["input"]>;
  clientId?: InputMaybe<Scalars["String"]["input"]>;
  closeDate?: InputMaybe<Scalars["DateTime"]["input"]>;
  description?: InputMaybe<Scalars["String"]["input"]>;
  openDate?: InputMaybe<Scalars["DateTime"]["input"]>;
  ownerUserId?: InputMaybe<Scalars["String"]["input"]>;
  priority?: InputMaybe<JobPriority>;
  status?: InputMaybe<JobStatus>;
  title?: InputMaybe<Scalars["String"]["input"]>;
};

export type UpdateProfileInput = {
  firstName?: InputMaybe<Scalars["String"]["input"]>;
  lastName?: InputMaybe<Scalars["String"]["input"]>;
};

export type UpdateRoleInput = {
  description?: InputMaybe<Scalars["String"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  permissions?: InputMaybe<Array<Scalars["String"]["input"]>>;
};

export type UpdateTeamInput = {
  kind?: InputMaybe<TeamKind>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  parentId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type UpdateTeamMemberInput = {
  role: TeamRole;
};

export type UserModel = {
  __typename?: "UserModel";
  authIdentityId?: Maybe<Scalars["String"]["output"]>;
  createdAt: Scalars["DateTime"]["output"];
  email: Scalars["String"]["output"];
  /** Timestamp of the user's first login */
  firstLogin?: Maybe<Scalars["DateTime"]["output"]>;
  firstName: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  /** Timestamp when the user was last deactivated */
  lastInactiveAt?: Maybe<Scalars["DateTime"]["output"]>;
  lastName: Scalars["String"]["output"];
  loginable: Scalars["Boolean"]["output"];
  /** Whether TOTP MFA is enrolled for this user */
  mfaEnrolled: Scalars["Boolean"]["output"];
  tenantId: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type CandidateFieldsFragment = {
  __typename?: "CandidateModel";
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  currentCompany?: string | null;
  currentTitle?: string | null;
  location?: string | null;
  status: CandidateStatus;
  notes?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCandidateMutationVariables = Exact<{
  input: CreateCandidateInput;
}>;

export type CreateCandidateMutation = {
  __typename?: "Mutation";
  createCandidate: {
    __typename?: "CandidateModel";
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    currentCompany?: string | null;
    currentTitle?: string | null;
    location?: string | null;
    status: CandidateStatus;
    notes?: string | null;
    linkedinUrl?: string | null;
    githubUrl?: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

export type UpdateCandidateMutationVariables = Exact<{
  id: Scalars["ID"]["input"];
  input: UpdateCandidateInput;
}>;

export type UpdateCandidateMutation = {
  __typename?: "Mutation";
  updateCandidate: {
    __typename?: "CandidateModel";
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    currentCompany?: string | null;
    currentTitle?: string | null;
    location?: string | null;
    status: CandidateStatus;
    notes?: string | null;
    linkedinUrl?: string | null;
    githubUrl?: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

export type DeleteCandidateMutationVariables = Exact<{
  id: Scalars["ID"]["input"];
}>;

export type DeleteCandidateMutation = {
  __typename?: "Mutation";
  deleteCandidate: { __typename?: "CandidateModel"; id: string; deletedAt?: string | null };
};

export type CandidatesQueryVariables = Exact<{
  first?: InputMaybe<Scalars["Int"]["input"]>;
  after?: InputMaybe<Scalars["String"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  filter?: InputMaybe<CandidateFilterInput>;
  sortBy?: InputMaybe<CandidateSortField>;
  sortOrder?: InputMaybe<SortOrder>;
}>;

export type CandidatesQuery = {
  __typename?: "Query";
  candidates: {
    __typename?: "CandidateConnection";
    totalCount: number;
    edges: Array<{
      __typename?: "CandidateEdge";
      cursor: string;
      node: {
        __typename?: "CandidateModel";
        id: string;
        firstName: string;
        lastName: string;
        email?: string | null;
        phone?: string | null;
        currentCompany?: string | null;
        currentTitle?: string | null;
        location?: string | null;
        status: CandidateStatus;
        notes?: string | null;
        linkedinUrl?: string | null;
        githubUrl?: string | null;
        createdAt: string;
        updatedAt: string;
      };
    }>;
    pageInfo: {
      __typename?: "PageInfo";
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor?: string | null;
      endCursor?: string | null;
    };
  };
};

export type CandidateQueryVariables = Exact<{
  id: Scalars["ID"]["input"];
}>;

export type CandidateQuery = {
  __typename?: "Query";
  candidate: {
    __typename?: "CandidateModel";
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    currentCompany?: string | null;
    currentTitle?: string | null;
    location?: string | null;
    status: CandidateStatus;
    notes?: string | null;
    linkedinUrl?: string | null;
    githubUrl?: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

export type CreateTenantMutationVariables = Exact<{
  input: CreateTenantInput;
}>;

export type CreateTenantMutation = {
  __typename?: "Mutation";
  createTenant: { __typename?: "TenantModel"; id: string; name: string; slug: string };
};

export type UpdateMyProfileMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;

export type UpdateMyProfileMutation = {
  __typename?: "Mutation";
  updateMyProfile: {
    __typename?: "UserModel";
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    firstLogin?: string | null;
    lastInactiveAt?: string | null;
  };
};

export type MeQueryVariables = Exact<{ [key: string]: never }>;

export type MeQuery = {
  __typename?: "Query";
  me: {
    __typename?: "UserModel";
    id: string;
    authIdentityId?: string | null;
    email: string;
    firstName: string;
    lastName: string;
    mfaEnrolled: boolean;
    firstLogin?: string | null;
    lastInactiveAt?: string | null;
  };
};

export type MyTenantsQueryVariables = Exact<{ [key: string]: never }>;

export type MyTenantsQuery = {
  __typename?: "Query";
  myTenants: Array<{ __typename?: "TenantModel"; id: string; name: string; slug: string }>;
};

export const CandidateFieldsFragmentDoc = {
  kind: "Document",
  definitions: [
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "CandidateFields" },
      typeCondition: { kind: "NamedType", name: { kind: "Name", value: "CandidateModel" } },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "firstName" } },
          { kind: "Field", name: { kind: "Name", value: "lastName" } },
          { kind: "Field", name: { kind: "Name", value: "email" } },
          { kind: "Field", name: { kind: "Name", value: "phone" } },
          { kind: "Field", name: { kind: "Name", value: "currentCompany" } },
          { kind: "Field", name: { kind: "Name", value: "currentTitle" } },
          { kind: "Field", name: { kind: "Name", value: "location" } },
          { kind: "Field", name: { kind: "Name", value: "status" } },
          { kind: "Field", name: { kind: "Name", value: "notes" } },
          { kind: "Field", name: { kind: "Name", value: "linkedinUrl" } },
          { kind: "Field", name: { kind: "Name", value: "githubUrl" } },
          { kind: "Field", name: { kind: "Name", value: "createdAt" } },
          { kind: "Field", name: { kind: "Name", value: "updatedAt" } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CandidateFieldsFragment, unknown>;
export const CreateCandidateDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "CreateCandidate" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "input" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "CreateCandidateInput" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "createCandidate" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: { kind: "Variable", name: { kind: "Name", value: "input" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "FragmentSpread", name: { kind: "Name", value: "CandidateFields" } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "CandidateFields" },
      typeCondition: { kind: "NamedType", name: { kind: "Name", value: "CandidateModel" } },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "firstName" } },
          { kind: "Field", name: { kind: "Name", value: "lastName" } },
          { kind: "Field", name: { kind: "Name", value: "email" } },
          { kind: "Field", name: { kind: "Name", value: "phone" } },
          { kind: "Field", name: { kind: "Name", value: "currentCompany" } },
          { kind: "Field", name: { kind: "Name", value: "currentTitle" } },
          { kind: "Field", name: { kind: "Name", value: "location" } },
          { kind: "Field", name: { kind: "Name", value: "status" } },
          { kind: "Field", name: { kind: "Name", value: "notes" } },
          { kind: "Field", name: { kind: "Name", value: "linkedinUrl" } },
          { kind: "Field", name: { kind: "Name", value: "githubUrl" } },
          { kind: "Field", name: { kind: "Name", value: "createdAt" } },
          { kind: "Field", name: { kind: "Name", value: "updatedAt" } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateCandidateMutation, CreateCandidateMutationVariables>;
export const UpdateCandidateDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "UpdateCandidate" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "input" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UpdateCandidateInput" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "updateCandidate" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "id" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: { kind: "Variable", name: { kind: "Name", value: "input" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "FragmentSpread", name: { kind: "Name", value: "CandidateFields" } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "CandidateFields" },
      typeCondition: { kind: "NamedType", name: { kind: "Name", value: "CandidateModel" } },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "firstName" } },
          { kind: "Field", name: { kind: "Name", value: "lastName" } },
          { kind: "Field", name: { kind: "Name", value: "email" } },
          { kind: "Field", name: { kind: "Name", value: "phone" } },
          { kind: "Field", name: { kind: "Name", value: "currentCompany" } },
          { kind: "Field", name: { kind: "Name", value: "currentTitle" } },
          { kind: "Field", name: { kind: "Name", value: "location" } },
          { kind: "Field", name: { kind: "Name", value: "status" } },
          { kind: "Field", name: { kind: "Name", value: "notes" } },
          { kind: "Field", name: { kind: "Name", value: "linkedinUrl" } },
          { kind: "Field", name: { kind: "Name", value: "githubUrl" } },
          { kind: "Field", name: { kind: "Name", value: "createdAt" } },
          { kind: "Field", name: { kind: "Name", value: "updatedAt" } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateCandidateMutation, UpdateCandidateMutationVariables>;
export const DeleteCandidateDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "DeleteCandidate" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "deleteCandidate" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "id" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "deletedAt" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DeleteCandidateMutation, DeleteCandidateMutationVariables>;
export const CandidatesDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "Candidates" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "first" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "after" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "last" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "before" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "filter" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "CandidateFilterInput" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "sortBy" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "CandidateSortField" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "sortOrder" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "SortOrder" } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "candidates" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "first" },
                value: { kind: "Variable", name: { kind: "Name", value: "first" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "after" },
                value: { kind: "Variable", name: { kind: "Name", value: "after" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "last" },
                value: { kind: "Variable", name: { kind: "Name", value: "last" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "before" },
                value: { kind: "Variable", name: { kind: "Name", value: "before" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "filter" },
                value: { kind: "Variable", name: { kind: "Name", value: "filter" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "sortBy" },
                value: { kind: "Variable", name: { kind: "Name", value: "sortBy" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "sortOrder" },
                value: { kind: "Variable", name: { kind: "Name", value: "sortOrder" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "edges" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "cursor" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "node" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "FragmentSpread",
                              name: { kind: "Name", value: "CandidateFields" },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "pageInfo" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "hasNextPage" } },
                      { kind: "Field", name: { kind: "Name", value: "hasPreviousPage" } },
                      { kind: "Field", name: { kind: "Name", value: "startCursor" } },
                      { kind: "Field", name: { kind: "Name", value: "endCursor" } },
                    ],
                  },
                },
                { kind: "Field", name: { kind: "Name", value: "totalCount" } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "CandidateFields" },
      typeCondition: { kind: "NamedType", name: { kind: "Name", value: "CandidateModel" } },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "firstName" } },
          { kind: "Field", name: { kind: "Name", value: "lastName" } },
          { kind: "Field", name: { kind: "Name", value: "email" } },
          { kind: "Field", name: { kind: "Name", value: "phone" } },
          { kind: "Field", name: { kind: "Name", value: "currentCompany" } },
          { kind: "Field", name: { kind: "Name", value: "currentTitle" } },
          { kind: "Field", name: { kind: "Name", value: "location" } },
          { kind: "Field", name: { kind: "Name", value: "status" } },
          { kind: "Field", name: { kind: "Name", value: "notes" } },
          { kind: "Field", name: { kind: "Name", value: "linkedinUrl" } },
          { kind: "Field", name: { kind: "Name", value: "githubUrl" } },
          { kind: "Field", name: { kind: "Name", value: "createdAt" } },
          { kind: "Field", name: { kind: "Name", value: "updatedAt" } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CandidatesQuery, CandidatesQueryVariables>;
export const CandidateDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "Candidate" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "candidate" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "id" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "FragmentSpread", name: { kind: "Name", value: "CandidateFields" } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "CandidateFields" },
      typeCondition: { kind: "NamedType", name: { kind: "Name", value: "CandidateModel" } },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "firstName" } },
          { kind: "Field", name: { kind: "Name", value: "lastName" } },
          { kind: "Field", name: { kind: "Name", value: "email" } },
          { kind: "Field", name: { kind: "Name", value: "phone" } },
          { kind: "Field", name: { kind: "Name", value: "currentCompany" } },
          { kind: "Field", name: { kind: "Name", value: "currentTitle" } },
          { kind: "Field", name: { kind: "Name", value: "location" } },
          { kind: "Field", name: { kind: "Name", value: "status" } },
          { kind: "Field", name: { kind: "Name", value: "notes" } },
          { kind: "Field", name: { kind: "Name", value: "linkedinUrl" } },
          { kind: "Field", name: { kind: "Name", value: "githubUrl" } },
          { kind: "Field", name: { kind: "Name", value: "createdAt" } },
          { kind: "Field", name: { kind: "Name", value: "updatedAt" } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CandidateQuery, CandidateQueryVariables>;
export const CreateTenantDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "CreateTenant" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "input" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "CreateTenantInput" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "createTenant" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: { kind: "Variable", name: { kind: "Name", value: "input" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "slug" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateTenantMutation, CreateTenantMutationVariables>;
export const UpdateMyProfileDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "UpdateMyProfile" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "input" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UpdateProfileInput" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "updateMyProfile" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: { kind: "Variable", name: { kind: "Name", value: "input" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "email" } },
                { kind: "Field", name: { kind: "Name", value: "firstName" } },
                { kind: "Field", name: { kind: "Name", value: "lastName" } },
                { kind: "Field", name: { kind: "Name", value: "firstLogin" } },
                { kind: "Field", name: { kind: "Name", value: "lastInactiveAt" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateMyProfileMutation, UpdateMyProfileMutationVariables>;
export const MeDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "Me" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "me" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "authIdentityId" } },
                { kind: "Field", name: { kind: "Name", value: "email" } },
                { kind: "Field", name: { kind: "Name", value: "firstName" } },
                { kind: "Field", name: { kind: "Name", value: "lastName" } },
                { kind: "Field", name: { kind: "Name", value: "mfaEnrolled" } },
                { kind: "Field", name: { kind: "Name", value: "firstLogin" } },
                { kind: "Field", name: { kind: "Name", value: "lastInactiveAt" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const MyTenantsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "MyTenants" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "myTenants" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "slug" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MyTenantsQuery, MyTenantsQueryVariables>;
