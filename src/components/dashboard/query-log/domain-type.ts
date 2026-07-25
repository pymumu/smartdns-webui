// DNS resource records
const domainTypeMap: Record<number, string> = {
1: "A", //RFC 1035
2: "NS", //RFC 1035
5: "CNAME", //RFC 1035
6: "SOA", //RFC 1035 and RFC 2308
12: "PTR", //RFC 1035
13: "HINFO", //RFC 8482
15: "MX", //RFC 1035 and RFC 7505
16: "TXT", //RFC 1035
17: "RP", //RFC 1183
18: "AFSDB", //RFC 1183
24: "SIG", //RFC 2535
25: "KEY", //RFC 2535 and RFC 2930
28: "AAAA", //RFC 3596
29: "LOC", //RFC 1876
33: "SRV", //RFC 2782
35: "NAPTR", //RFC 3403
36: "KX", //RFC 2230
37: "CERT", //RFC 4398
39: "DNAME", //RFC 6672
42: "APL", //RFC 3123
43: "DS", //RFC 4034
44: "SSHFP", //RFC 4255
45: "IPSECKEY", //RFC 4025
46: "RRSIG", //RFC 4034
47: "NSEC", //RFC 4034
48: "DNSKEY", //RFC 4034
49: "DHCID", //RFC 4701
50: "NSEC3", //RFC 5155
51: "NSEC3PARAM", //RFC 5155
52: "TLSA", //RFC 6698
53: "SMIMEA", //RFC 8162
55: "HIP", //RFC 8005
59: "CDS", //RFC 7344
60: "CDNSKEY", //RFC 7344
61: "OPENPGPKEY", //RFC 7929
62: "CSYNC", //RFC 7477
63: "ZONEMD", //RFC 8976
64: "SVCB", //IETF Draft
65: "HTTPS", //IETF Draft
108: "EUI48", //RFC 7043
109: "EUI64", //RFC 7043
249: "TKEY", //RFC 2930
250: "TSIG", //RFC 2845
256: "URI", //RFC 7553
257: "CAA", //RFC 6844
32768: "TA",
32769: "DLV", //RFC 4431
};

export function getDomainTypeName(type: number): string {
  return domainTypeMap[type] ?? `UNKNOWN(${type})`;
}
