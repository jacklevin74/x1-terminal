// LZ4 frame decoder. Checksums are skipped; bounds and content size are checked.
// Format: https://github.com/lz4/lz4/blob/dev/doc/lz4_Frame_format.md
export function decodeLz4(input, limit = 32 * 1024 * 1024) {
 const src = Buffer.from(input); let p = 0; let out = Buffer.alloc(Math.min(limit, 65536)); let used = 0;
 const need = n => { if (p + n > src.length) throw new Error("Truncated LZ4 archive"); };
 const u32 = () => { need(4); const n = src.readUInt32LE(p); p += 4; return n; };
 const grow = n => { if (used + n > limit) throw new Error("Archive exceeds decoded size limit"); if (used + n > out.length) { const next = Buffer.alloc(Math.min(limit, Math.max(used+n,out.length*2))); out.copy(next,0,0,used); out=next; } };
 while (p < src.length) {
  if (u32() !== 0x184d2204) throw new Error("Unsupported LZ4 frame");
  need(2); const flags = src[p++]; const bd = src[p++];
  if ((flags >> 6) !== 1 || (flags & 3) || (bd & 0x8f)) throw new Error("Unsupported LZ4 options");
  const blockMax = {4:65536,5:262144,6:1048576,7:4194304}[(bd >> 4) & 7];
  if (!blockMax) throw new Error("Invalid LZ4 block size");
  const frameStart = used; let contentSize;
  if (flags & 8) { need(8); contentSize = src.readBigUInt64LE(p); p+=8; if (contentSize > BigInt(limit-used)) throw new Error("Archive exceeds decoded size limit"); }
  need(1); p++; // Header checksum.
  while (true) {
   const raw = u32(); if (!raw) break;
   const size = raw & 0x7fffffff; if (size > blockMax) throw new Error("Invalid LZ4 block size");
   need(size); const end = p+size; const blockStart=used;
   if (raw & 0x80000000) { grow(size); src.copy(out,used,p,end); used+=size; p=end; }
   else while (p < end) {
    const token=src[p++]; let literals=token >> 4;
    const extended = initial => { let n=initial; if (initial===15) { let byte; do { if (p>=end) throw new Error("Invalid LZ4 length"); byte=src[p++]; n+=byte; } while(byte===255); } return n; };
    literals=extended(literals); if(p+literals>end) throw new Error("Invalid LZ4 literals"); grow(literals); src.copy(out,used,p,p+literals); used+=literals; p+=literals;
    if(p===end) break;
    if(p+2>end) throw new Error("Invalid LZ4 offset"); const offset=src.readUInt16LE(p); p+=2;
    if(!offset || offset > used-((flags & 32) ? blockStart : frameStart)) throw new Error("Invalid LZ4 back reference");
    const length=extended(token & 15)+4; grow(length); for(let i=0;i<length;i++) {out[used]=out[used-offset];used++;}
    if(used-blockStart>blockMax) throw new Error("Invalid LZ4 block output");
   }
   if(used-blockStart>blockMax) throw new Error("Invalid LZ4 block output");
   if(flags & 16) { need(4); p+=4; }
  }
  if(contentSize!==undefined && BigInt(used-frameStart)!==contentSize) throw new Error("Invalid LZ4 content size");
  if(flags & 4) { need(4); p+=4; }
 }
 return out.subarray(0,used).toString("utf8");
}
