module.exports = {
  src: "./src",
  schema: "./src/schema.graphql",
  language: "typescript",
  excludes: ["**/node_modules/**", "**/__mocks__/**", "**/__generated__/**"],
  artifactDirectory: "./src/__generated__",
  // Hat tip to Gemini which suggested the working spelling of `eagerEsModules`, when other AIs & web pages
  // instead suggested the erroneous (but more correct IMHO) `eagerESModules`!
  eagerEsModules: true,
};