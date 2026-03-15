import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  // Development: local schema file (mirrors expected API shape).
  // Production: switch to "http://localhost:8000/graphql" once API resolvers exist.
  schema: "./schema.graphql",
  documents: "src/graphql/**/*.graphql",
  ignoreNoDocuments: true,
  generates: {
    "src/graphql/generated/": {
      preset: "client",
      presetConfig: {
        fragmentMasking: false,
      },
      config: {
        scalars: {
          DateTime: "string",
        },
        enumsAsTypes: true,
        skipTypename: false,
        dedupeFragments: true,
      },
    },
  },
};

export default config;
