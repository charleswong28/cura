/* eslint-disable */
import * as types from "./graphql";
import { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";

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
  "fragment CandidateFields on CandidateModel {\n  id\n  firstName\n  lastName\n  email\n  phone\n  currentCompany\n  currentTitle\n  location\n  status\n  notes\n  linkedinUrl\n  githubUrl\n  createdAt\n  updatedAt\n}": typeof types.CandidateFieldsFragmentDoc;
  "mutation CreateCandidate($input: CreateCandidateInput!) {\n  createCandidate(input: $input) {\n    ...CandidateFields\n  }\n}\n\nmutation UpdateCandidate($id: ID!, $input: UpdateCandidateInput!) {\n  updateCandidate(id: $id, input: $input) {\n    ...CandidateFields\n  }\n}\n\nmutation DeleteCandidate($id: ID!) {\n  deleteCandidate(id: $id) {\n    id\n    deletedAt\n  }\n}": typeof types.CreateCandidateDocument;
  "query Candidates($first: Int, $after: String, $last: Int, $before: String, $filter: CandidateFilterInput, $sortBy: CandidateSortField, $sortOrder: SortOrder) {\n  candidates(\n    first: $first\n    after: $after\n    last: $last\n    before: $before\n    filter: $filter\n    sortBy: $sortBy\n    sortOrder: $sortOrder\n  ) {\n    edges {\n      cursor\n      node {\n        ...CandidateFields\n      }\n    }\n    pageInfo {\n      hasNextPage\n      hasPreviousPage\n      startCursor\n      endCursor\n    }\n    totalCount\n  }\n}\n\nquery Candidate($id: ID!) {\n  candidate(id: $id) {\n    ...CandidateFields\n  }\n}": typeof types.CandidatesDocument;
  "mutation CreateTenant($input: CreateTenantInput!) {\n  createTenant(input: $input) {\n    id\n    name\n    slug\n  }\n}": typeof types.CreateTenantDocument;
  "mutation UpdateMyProfile($input: UpdateProfileInput!) {\n  updateMyProfile(input: $input) {\n    id\n    email\n    firstName\n    lastName\n    firstLogin\n    lastInactiveAt\n  }\n}": typeof types.UpdateMyProfileDocument;
  "query Me {\n  me {\n    id\n    authIdentityId\n    email\n    firstName\n    lastName\n    mfaEnrolled\n    firstLogin\n    lastInactiveAt\n  }\n}\n\nquery MyTenants {\n  myTenants {\n    id\n    name\n    slug\n  }\n}": typeof types.MeDocument;
};
const documents: Documents = {
  "fragment CandidateFields on CandidateModel {\n  id\n  firstName\n  lastName\n  email\n  phone\n  currentCompany\n  currentTitle\n  location\n  status\n  notes\n  linkedinUrl\n  githubUrl\n  createdAt\n  updatedAt\n}":
    types.CandidateFieldsFragmentDoc,
  "mutation CreateCandidate($input: CreateCandidateInput!) {\n  createCandidate(input: $input) {\n    ...CandidateFields\n  }\n}\n\nmutation UpdateCandidate($id: ID!, $input: UpdateCandidateInput!) {\n  updateCandidate(id: $id, input: $input) {\n    ...CandidateFields\n  }\n}\n\nmutation DeleteCandidate($id: ID!) {\n  deleteCandidate(id: $id) {\n    id\n    deletedAt\n  }\n}":
    types.CreateCandidateDocument,
  "query Candidates($first: Int, $after: String, $last: Int, $before: String, $filter: CandidateFilterInput, $sortBy: CandidateSortField, $sortOrder: SortOrder) {\n  candidates(\n    first: $first\n    after: $after\n    last: $last\n    before: $before\n    filter: $filter\n    sortBy: $sortBy\n    sortOrder: $sortOrder\n  ) {\n    edges {\n      cursor\n      node {\n        ...CandidateFields\n      }\n    }\n    pageInfo {\n      hasNextPage\n      hasPreviousPage\n      startCursor\n      endCursor\n    }\n    totalCount\n  }\n}\n\nquery Candidate($id: ID!) {\n  candidate(id: $id) {\n    ...CandidateFields\n  }\n}":
    types.CandidatesDocument,
  "mutation CreateTenant($input: CreateTenantInput!) {\n  createTenant(input: $input) {\n    id\n    name\n    slug\n  }\n}":
    types.CreateTenantDocument,
  "mutation UpdateMyProfile($input: UpdateProfileInput!) {\n  updateMyProfile(input: $input) {\n    id\n    email\n    firstName\n    lastName\n    firstLogin\n    lastInactiveAt\n  }\n}":
    types.UpdateMyProfileDocument,
  "query Me {\n  me {\n    id\n    authIdentityId\n    email\n    firstName\n    lastName\n    mfaEnrolled\n    firstLogin\n    lastInactiveAt\n  }\n}\n\nquery MyTenants {\n  myTenants {\n    id\n    name\n    slug\n  }\n}":
    types.MeDocument,
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
export function graphql(
  source: "fragment CandidateFields on CandidateModel {\n  id\n  firstName\n  lastName\n  email\n  phone\n  currentCompany\n  currentTitle\n  location\n  status\n  notes\n  linkedinUrl\n  githubUrl\n  createdAt\n  updatedAt\n}"
): (typeof documents)["fragment CandidateFields on CandidateModel {\n  id\n  firstName\n  lastName\n  email\n  phone\n  currentCompany\n  currentTitle\n  location\n  status\n  notes\n  linkedinUrl\n  githubUrl\n  createdAt\n  updatedAt\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "mutation CreateCandidate($input: CreateCandidateInput!) {\n  createCandidate(input: $input) {\n    ...CandidateFields\n  }\n}\n\nmutation UpdateCandidate($id: ID!, $input: UpdateCandidateInput!) {\n  updateCandidate(id: $id, input: $input) {\n    ...CandidateFields\n  }\n}\n\nmutation DeleteCandidate($id: ID!) {\n  deleteCandidate(id: $id) {\n    id\n    deletedAt\n  }\n}"
): (typeof documents)["mutation CreateCandidate($input: CreateCandidateInput!) {\n  createCandidate(input: $input) {\n    ...CandidateFields\n  }\n}\n\nmutation UpdateCandidate($id: ID!, $input: UpdateCandidateInput!) {\n  updateCandidate(id: $id, input: $input) {\n    ...CandidateFields\n  }\n}\n\nmutation DeleteCandidate($id: ID!) {\n  deleteCandidate(id: $id) {\n    id\n    deletedAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "query Candidates($first: Int, $after: String, $last: Int, $before: String, $filter: CandidateFilterInput, $sortBy: CandidateSortField, $sortOrder: SortOrder) {\n  candidates(\n    first: $first\n    after: $after\n    last: $last\n    before: $before\n    filter: $filter\n    sortBy: $sortBy\n    sortOrder: $sortOrder\n  ) {\n    edges {\n      cursor\n      node {\n        ...CandidateFields\n      }\n    }\n    pageInfo {\n      hasNextPage\n      hasPreviousPage\n      startCursor\n      endCursor\n    }\n    totalCount\n  }\n}\n\nquery Candidate($id: ID!) {\n  candidate(id: $id) {\n    ...CandidateFields\n  }\n}"
): (typeof documents)["query Candidates($first: Int, $after: String, $last: Int, $before: String, $filter: CandidateFilterInput, $sortBy: CandidateSortField, $sortOrder: SortOrder) {\n  candidates(\n    first: $first\n    after: $after\n    last: $last\n    before: $before\n    filter: $filter\n    sortBy: $sortBy\n    sortOrder: $sortOrder\n  ) {\n    edges {\n      cursor\n      node {\n        ...CandidateFields\n      }\n    }\n    pageInfo {\n      hasNextPage\n      hasPreviousPage\n      startCursor\n      endCursor\n    }\n    totalCount\n  }\n}\n\nquery Candidate($id: ID!) {\n  candidate(id: $id) {\n    ...CandidateFields\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "mutation CreateTenant($input: CreateTenantInput!) {\n  createTenant(input: $input) {\n    id\n    name\n    slug\n  }\n}"
): (typeof documents)["mutation CreateTenant($input: CreateTenantInput!) {\n  createTenant(input: $input) {\n    id\n    name\n    slug\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "mutation UpdateMyProfile($input: UpdateProfileInput!) {\n  updateMyProfile(input: $input) {\n    id\n    email\n    firstName\n    lastName\n    firstLogin\n    lastInactiveAt\n  }\n}"
): (typeof documents)["mutation UpdateMyProfile($input: UpdateProfileInput!) {\n  updateMyProfile(input: $input) {\n    id\n    email\n    firstName\n    lastName\n    firstLogin\n    lastInactiveAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "query Me {\n  me {\n    id\n    authIdentityId\n    email\n    firstName\n    lastName\n    mfaEnrolled\n    firstLogin\n    lastInactiveAt\n  }\n}\n\nquery MyTenants {\n  myTenants {\n    id\n    name\n    slug\n  }\n}"
): (typeof documents)["query Me {\n  me {\n    id\n    authIdentityId\n    email\n    firstName\n    lastName\n    mfaEnrolled\n    firstLogin\n    lastInactiveAt\n  }\n}\n\nquery MyTenants {\n  myTenants {\n    id\n    name\n    slug\n  }\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
