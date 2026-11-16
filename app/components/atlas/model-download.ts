/** Static hosts may serve .gz as a compressed response or as a gzip file.
 * Fetch already decodes Content-Encoding; inspect the payload to avoid decoding twice.
 */
export async function decodeModelResponse(response:Response,expectedBytes:number):Promise<ArrayBuffer>{
 if(!response.ok)throw new Error('An anatomy file could not be loaded.');
 const payload=await response.arrayBuffer();
 if(payload.byteLength===expectedBytes) return payload;
 const signature=new Uint8Array(payload,0,Math.min(2,payload.byteLength));
 const isGzip=signature[0]===0x1f&&signature[1]===0x8b;
 if(isGzip&&typeof DecompressionStream!=='undefined'){
   try{
     const decompressed=await new Response(new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
     if(decompressed.byteLength===expectedBytes) return decompressed;
   }catch{
     // Fallback to payload
   }
 }
 return payload;
}
