/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "fragment CandidateFields on Candidate {\n  id\n  firstName\n  lastName\n  email\n  phone\n  currentCompany\n  currentTitle\n  location\n  status\n  notes\n  linkedinUrl\n  githubUrl\n  createdAt\n  updatedAt\n}": typeof types.CandidateFieldsFragmentDoc,
    "mutation CreateCandidate($input: CreateCandidateInput!) {\n  createCandidate(input: $input) {\n    ...CandidateFields\n  }\n}\n\nmutation UpdateCandidate($id: ID!, $input: UpdateCandidateInput!) {\n  updateCandidate(id: $id, input: $input) {\n    ...CandidateFields\n  }\n}\n\nmutation DeleteCandidate($id: ID!) {\n  deleteCandidate(id: $id)\n}": typeof types.CreateCandidateDocument,
    "query Candidates($first: Int, $after: String, $search: String, $status: CandidateStatus, $sortBy: String, $sortOrder: String) {\n  candidates(\n    first: $first\n    after: $after\n    search: $search\n    status: $status\n    sortBy: $sortBy\n    sortOrder: $sortOrder\n  ) {\n    edges {\n      cursor\n      node {\n        ...CandidateFields\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    totalCount\n  }\n}\n\nquery Candidate($id: ID!) {\n  candidate(id: $id) {\n    ...CandidateFields\n  }\n}": typeof types.CandidatesDocument,
    "fragment ClientFields on Client {\n  id\n  name\n  industry\n  website\n  phone\n  address\n  status\n  createdAt\n  updatedAt\n}\n\nfragment ClientWithJobs on Client {\n  ...ClientFields\n  jobs {\n    id\n    title\n    status\n    priority\n  }\n}": typeof types.ClientFieldsFragmentDoc,
    "mutation CreateClient($input: CreateClientInput!) {\n  createClient(input: $input) {\n    ...ClientFields\n  }\n}\n\nmutation UpdateClient($id: ID!, $input: UpdateClientInput!) {\n  updateClient(id: $id, input: $input) {\n    ...ClientFields\n  }\n}\n\nmutation DeleteClient($id: ID!) {\n  deleteClient(id: $id)\n}": typeof types.CreateClientDocument,
    "query Clients($first: Int, $after: String, $search: String, $status: ClientStatus, $sortBy: String, $sortOrder: String) {\n  clients(\n    first: $first\n    after: $after\n    search: $search\n    status: $status\n    sortBy: $sortBy\n    sortOrder: $sortOrder\n  ) {\n    edges {\n      cursor\n      node {\n        ...ClientFields\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    totalCount\n  }\n}\n\nquery Client($id: ID!) {\n  client(id: $id) {\n    ...ClientWithJobs\n  }\n}": typeof types.ClientsDocument,
    "fragment JobFields on Job {\n  id\n  title\n  description\n  status\n  priority\n  client {\n    id\n    name\n  }\n  assignedTo {\n    id\n    firstName\n    lastName\n  }\n  createdAt\n  updatedAt\n}": typeof types.JobFieldsFragmentDoc,
    "mutation CreateJob($input: CreateJobInput!) {\n  createJob(input: $input) {\n    ...JobFields\n  }\n}\n\nmutation UpdateJob($id: ID!, $input: UpdateJobInput!) {\n  updateJob(id: $id, input: $input) {\n    ...JobFields\n  }\n}\n\nmutation DeleteJob($id: ID!) {\n  deleteJob(id: $id)\n}": typeof types.CreateJobDocument,
    "query Jobs($first: Int, $after: String, $search: String, $status: JobStatus, $priority: JobPriority, $sortBy: String, $sortOrder: String) {\n  jobs(\n    first: $first\n    after: $after\n    search: $search\n    status: $status\n    priority: $priority\n    sortBy: $sortBy\n    sortOrder: $sortOrder\n  ) {\n    edges {\n      cursor\n      node {\n        ...JobFields\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    totalCount\n  }\n}\n\nquery Job($id: ID!) {\n  job(id: $id) {\n    ...JobFields\n  }\n}": typeof types.JobsDocument,
    "query Me {\n  me {\n    id\n    authIdentityId\n    email\n    firstName\n    lastName\n    mfaEnrolled\n  }\n}": typeof types.MeDocument,
};
const documents: Documents = {
    "fragment CandidateFields on Candidate {\n  id\n  firstName\n  lastName\n  email\n  phone\n  currentCompany\n  currentTitle\n  location\n  status\n  notes\n  linkedinUrl\n  githubUrl\n  createdAt\n  updatedAt\n}": types.CandidateFieldsFragmentDoc,
    "mutation CreateCandidate($input: CreateCandidateInput!) {\n  createCandidate(input: $input) {\n    ...CandidateFields\n  }\n}\n\nmutation UpdateCandidate($id: ID!, $input: UpdateCandidateInput!) {\n  updateCandidate(id: $id, input: $input) {\n    ...CandidateFields\n  }\n}\n\nmutation DeleteCandidate($id: ID!) {\n  deleteCandidate(id: $id)\n}": types.CreateCandidateDocument,
    "query Candidates($first: Int, $after: String, $search: String, $status: CandidateStatus, $sortBy: String, $sortOrder: String) {\n  candidates(\n    first: $first\n    after: $after\n    search: $search\n    status: $status\n    sortBy: $sortBy\n    sortOrder: $sortOrder\n  ) {\n    edges {\n      cursor\n      node {\n        ...CandidateFields\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    totalCount\n  }\n}\n\nquery Candidate($id: ID!) {\n  candidate(id: $id) {\n    ...CandidateFields\n  }\n}": types.CandidatesDocument,
    "fragment ClientFields on Client {\n  id\n  name\n  industry\n  website\n  phone\n  address\n  status\n  createdAt\n  updatedAt\n}\n\nfragment ClientWithJobs on Client {\n  ...ClientFields\n  jobs {\n    id\n    title\n    status\n    priority\n  }\n}": types.ClientFieldsFragmentDoc,
    "mutation CreateClient($input: CreateClientInput!) {\n  createClient(input: $input) {\n    ...ClientFields\n  }\n}\n\nmutation UpdateClient($id: ID!, $input: UpdateClientInput!) {\n  updateClient(id: $id, input: $input) {\n    ...ClientFields\n  }\n}\n\nmutation DeleteClient($id: ID!) {\n  deleteClient(id: $id)\n}": types.CreateClientDocument,
    "query Clients($first: Int, $after: String, $search: String, $status: ClientStatus, $sortBy: String, $sortOrder: String) {\n  clients(\n    first: $first\n    after: $after\n    search: $search\n    status: $status\n    sortBy: $sortBy\n    sortOrder: $sortOrder\n  ) {\n    edges {\n      cursor\n      node {\n        ...ClientFields\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    totalCount\n  }\n}\n\nquery Client($id: ID!) {\n  client(id: $id) {\n    ...ClientWithJobs\n  }\n}": types.ClientsDocument,
    "fragment JobFields on Job {\n  id\n  title\n  description\n  status\n  priority\n  client {\n    id\n    name\n  }\n  assignedTo {\n    id\n    firstName\n    lastName\n  }\n  createdAt\n  updatedAt\n}": types.JobFieldsFragmentDoc,
    "mutation CreateJob($input: CreateJobInput!) {\n  createJob(input: $input) {\n    ...JobFields\n  }\n}\n\nmutation UpdateJob($id: ID!, $input: UpdateJobInput!) {\n  updateJob(id: $id, input: $input) {\n    ...JobFields\n  }\n}\n\nmutation DeleteJob($id: ID!) {\n  deleteJob(id: $id)\n}": types.CreateJobDocument,
    "query Jobs($first: Int, $after: String, $search: String, $status: JobStatus, $priority: JobPriority, $sortBy: String, $sortOrder: String) {\n  jobs(\n    first: $first\n    after: $after\n    search: $search\n    status: $status\n    priority: $priority\n    sortBy: $sortBy\n    sortOrder: $sortOrder\n  ) {\n    edges {\n      cursor\n      node {\n        ...JobFields\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    totalCount\n  }\n}\n\nquery Job($id: ID!) {\n  job(id: $id) {\n    ...JobFields\n  }\n}": types.JobsDocument,
    "query Me {\n  me {\n    id\n    authIdentityId\n    email\n    firstName\n    lastName\n    mfaEnrolled\n  }\n}": types.MeDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "fragment CandidateFields on Candidate {\n  id\n  firstName\n  lastName\n  email\n  phone\n  currentCompany\n  currentTitle\n  location\n  status\n  notes\n  linkedinUrl\n  githubUrl\n  createdAt\n  updatedAt\n}"): (typeof documents)["fragment CandidateFields on Candidate {\n  id\n  firstName\n  lastName\n  email\n  phone\n  currentCompany\n  currentTitle\n  location\n  status\n  notes\n  linkedinUrl\n  githubUrl\n  createdAt\n  updatedAt\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateCandidate($input: CreateCandidateInput!) {\n  createCandidate(input: $input) {\n    ...CandidateFields\n  }\n}\n\nmutation UpdateCandidate($id: ID!, $input: UpdateCandidateInput!) {\n  updateCandidate(id: $id, input: $input) {\n    ...CandidateFields\n  }\n}\n\nmutation DeleteCandidate($id: ID!) {\n  deleteCandidate(id: $id)\n}"): (typeof documents)["mutation CreateCandidate($input: CreateCandidateInput!) {\n  createCandidate(input: $input) {\n    ...CandidateFields\n  }\n}\n\nmutation UpdateCandidate($id: ID!, $input: UpdateCandidateInput!) {\n  updateCandidate(id: $id, input: $input) {\n    ...CandidateFields\n  }\n}\n\nmutation DeleteCandidate($id: ID!) {\n  deleteCandidate(id: $id)\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Candidates($first: Int, $after: String, $search: String, $status: CandidateStatus, $sortBy: String, $sortOrder: String) {\n  candidates(\n    first: $first\n    after: $after\n    search: $search\n    status: $status\n    sortBy: $sortBy\n    sortOrder: $sortOrder\n  ) {\n    edges {\n      cursor\n      node {\n        ...CandidateFields\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    totalCount\n  }\n}\n\nquery Candidate($id: ID!) {\n  candidate(id: $id) {\n    ...CandidateFields\n  }\n}"): (typeof documents)["query Candidates($first: Int, $after: String, $search: String, $status: CandidateStatus, $sortBy: String, $sortOrder: String) {\n  candidates(\n    first: $first\n    after: $after\n    search: $search\n    status: $status\n    sortBy: $sortBy\n    sortOrder: $sortOrder\n  ) {\n    edges {\n      cursor\n      node {\n        ...CandidateFields\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    totalCount\n  }\n}\n\nquery Candidate($id: ID!) {\n  candidate(id: $id) {\n    ...CandidateFields\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "fragment ClientFields on Client {\n  id\n  name\n  industry\n  website\n  phone\n  address\n  status\n  createdAt\n  updatedAt\n}\n\nfragment ClientWithJobs on Client {\n  ...ClientFields\n  jobs {\n    id\n    title\n    status\n    priority\n  }\n}"): (typeof documents)["fragment ClientFields on Client {\n  id\n  name\n  industry\n  website\n  phone\n  address\n  status\n  createdAt\n  updatedAt\n}\n\nfragment ClientWithJobs on Client {\n  ...ClientFields\n  jobs {\n    id\n    title\n    status\n    priority\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateClient($input: CreateClientInput!) {\n  createClient(input: $input) {\n    ...ClientFields\n  }\n}\n\nmutation UpdateClient($id: ID!, $input: UpdateClientInput!) {\n  updateClient(id: $id, input: $input) {\n    ...ClientFields\n  }\n}\n\nmutation DeleteClient($id: ID!) {\n  deleteClient(id: $id)\n}"): (typeof documents)["mutation CreateClient($input: CreateClientInput!) {\n  createClient(input: $input) {\n    ...ClientFields\n  }\n}\n\nmutation UpdateClient($id: ID!, $input: UpdateClientInput!) {\n  updateClient(id: $id, input: $input) {\n    ...ClientFields\n  }\n}\n\nmutation DeleteClient($id: ID!) {\n  deleteClient(id: $id)\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Clients($first: Int, $after: String, $search: String, $status: ClientStatus, $sortBy: String, $sortOrder: String) {\n  clients(\n    first: $first\n    after: $after\n    search: $search\n    status: $status\n    sortBy: $sortBy\n    sortOrder: $sortOrder\n  ) {\n    edges {\n      cursor\n      node {\n        ...ClientFields\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    totalCount\n  }\n}\n\nquery Client($id: ID!) {\n  client(id: $id) {\n    ...ClientWithJobs\n  }\n}"): (typeof documents)["query Clients($first: Int, $after: String, $search: String, $status: ClientStatus, $sortBy: String, $sortOrder: String) {\n  clients(\n    first: $first\n    after: $after\n    search: $search\n    status: $status\n    sortBy: $sortBy\n    sortOrder: $sortOrder\n  ) {\n    edges {\n      cursor\n      node {\n        ...ClientFields\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    totalCount\n  }\n}\n\nquery Client($id: ID!) {\n  client(id: $id) {\n    ...ClientWithJobs\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "fragment JobFields on Job {\n  id\n  title\n  description\n  status\n  priority\n  client {\n    id\n    name\n  }\n  assignedTo {\n    id\n    firstName\n    lastName\n  }\n  createdAt\n  updatedAt\n}"): (typeof documents)["fragment JobFields on Job {\n  id\n  title\n  description\n  status\n  priority\n  client {\n    id\n    name\n  }\n  assignedTo {\n    id\n    firstName\n    lastName\n  }\n  createdAt\n  updatedAt\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation CreateJob($input: CreateJobInput!) {\n  createJob(input: $input) {\n    ...JobFields\n  }\n}\n\nmutation UpdateJob($id: ID!, $input: UpdateJobInput!) {\n  updateJob(id: $id, input: $input) {\n    ...JobFields\n  }\n}\n\nmutation DeleteJob($id: ID!) {\n  deleteJob(id: $id)\n}"): (typeof documents)["mutation CreateJob($input: CreateJobInput!) {\n  createJob(input: $input) {\n    ...JobFields\n  }\n}\n\nmutation UpdateJob($id: ID!, $input: UpdateJobInput!) {\n  updateJob(id: $id, input: $input) {\n    ...JobFields\n  }\n}\n\nmutation DeleteJob($id: ID!) {\n  deleteJob(id: $id)\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Jobs($first: Int, $after: String, $search: String, $status: JobStatus, $priority: JobPriority, $sortBy: String, $sortOrder: String) {\n  jobs(\n    first: $first\n    after: $after\n    search: $search\n    status: $status\n    priority: $priority\n    sortBy: $sortBy\n    sortOrder: $sortOrder\n  ) {\n    edges {\n      cursor\n      node {\n        ...JobFields\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    totalCount\n  }\n}\n\nquery Job($id: ID!) {\n  job(id: $id) {\n    ...JobFields\n  }\n}"): (typeof documents)["query Jobs($first: Int, $after: String, $search: String, $status: JobStatus, $priority: JobPriority, $sortBy: String, $sortOrder: String) {\n  jobs(\n    first: $first\n    after: $after\n    search: $search\n    status: $status\n    priority: $priority\n    sortBy: $sortBy\n    sortOrder: $sortOrder\n  ) {\n    edges {\n      cursor\n      node {\n        ...JobFields\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    totalCount\n  }\n}\n\nquery Job($id: ID!) {\n  job(id: $id) {\n    ...JobFields\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Me {\n  me {\n    id\n    authIdentityId\n    email\n    firstName\n    lastName\n    mfaEnrolled\n  }\n}"): (typeof documents)["query Me {\n  me {\n    id\n    authIdentityId\n    email\n    firstName\n    lastName\n    mfaEnrolled\n  }\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;