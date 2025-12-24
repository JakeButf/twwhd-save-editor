const SAVE_DATA_SIZE = 0xA94;
const CHECKSUM_OFFSET = SAVE_DATA_SIZE - 8;

/**
 * Calculate checksum for a single save slot
 * @param data - The save data buffer (one save slot)
 * @param len - Length to calculate checksum over (defaults to CHECKSUM_OFFSET)
 * @returns The calculated checksum as a BigInt
 */
export function calculateChecksum(data: Uint8Array, len: number = CHECKSUM_OFFSET): bigint {
  let highBits = 0;
  //for whatever reason the checksum is off by 1 without adding 1 here.... not sure why
  let lowBits = ((~0) >>> 0) + 1; 
  
  for (let i = 0; i < len; i++) {
    const byte = data[i];
    highBits = (highBits + byte) >>> 0; //keep as unsigned 32-bit
    
    const invertedByte = (~byte) >>> 0;
    lowBits = (lowBits + invertedByte) >>> 0;
  }
  
  const checksum = (BigInt(highBits) << 32n) | BigInt(lowBits);
  
  return checksum;
}

export function updateChecksums(fileData: Uint8Array): Uint8Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(fileData.length);
  const modifiedData = new Uint8Array(buffer);
  modifiedData.set(fileData);
  
  //process all 3 save slots
  for (let i = 0; i < 3; i++) {
    const saveOffset = i * SAVE_DATA_SIZE;
    
    //read existing checksum for debugging
    const existingView = new DataView(modifiedData.buffer);
    const existingChecksum = existingView.getBigUint64(saveOffset + CHECKSUM_OFFSET, false);
    
    //calculate checksum using the data portion of the file
    //not sure if all of this is used for checksum but probably?
    const saveSlot = modifiedData.slice(saveOffset, saveOffset + CHECKSUM_OFFSET);
    
    const checksum = calculateChecksum(saveSlot, saveSlot.length);
    
    console.log(`Save slot ${i + 1}:`);
    console.log(`  Existing checksum: 0x${existingChecksum.toString(16).padStart(16, '0')}`);
    console.log(`  Calculated checksum: 0x${checksum.toString(16).padStart(16, '0')}`);
    
    const checksumOffset = saveOffset + CHECKSUM_OFFSET;
    const view = new DataView(modifiedData.buffer);
    view.setBigUint64(checksumOffset, checksum, false);
  }
  
  return modifiedData;
}
