declare module 'tz-lookup' {
  /** Returns the IANA timezone name for the given latitude/longitude. */
  function tzlookup(lat: number, lng: number): string;
  export default tzlookup;
}
