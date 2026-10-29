// decode-uri-component 0.2 (shipped in the mobile app through expo-router → query-string)
// has no types; the test of the app's deep-link filter only needs its default export.
declare module "decode-uri-component" {
  const decodeUriComponent: (input: string) => string;
  export default decodeUriComponent;
}
