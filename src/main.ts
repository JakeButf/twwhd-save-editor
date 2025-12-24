import './style.css';
import { updateChecksums } from './checksum';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div class="container">
    <header>
      <h1>The Wind Waker HD</h1>
      <h2>Save Editor</h2>
    </header>
    
    <main>
      <div class="upload-section">
        <div class="upload-area" id="uploadArea">
          <h3>Upload Save File</h3>
          <p>Drag and drop your .sav file here or click to browse</p>
          <input 
            type="file" 
            id="fileInput" 
            accept=".sav" 
            style="display: none;"
          />
          <button id="browseBtn" class="btn-primary">Browse Files</button>
        </div>
        
        <div id="fileInfo" class="file-info" style="display: none;">
          <div class="file-details">
            <h3>File Loaded</h3>
            <p><strong>Name:</strong> <span id="fileName"></span></p>
            <p><strong>Size:</strong> <span id="fileSize"></span></p>
          </div>
          
          <div class="save-files-section" id="saveFilesSection">
            <h3>Save Files</h3>
            <div id="saveFilesContainer"></div>
          </div>
          
          <div class="options-menu">
            <details class="advanced-dropdown" open>
              <summary>Advanced Options</summary>
              <div class="dropdown-content">
                <label class="checkbox-container">
                  <input type="checkbox" id="fixChecksumCheckbox" checked />
                  <span>Fix Checksum</span>
                </label>
              </div>
            </details>
          </div>
          
          <button id="downloadBtn" class="btn-primary">Download Modified Save</button>
          <button id="clearBtn" class="btn-secondary">Clear File</button>
        </div>
      </div>
    </main>
    
    <footer>
      <p>Upload a save file.</p>
    </footer>
  </div>
`;

const uploadArea = document.getElementById('uploadArea') as HTMLDivElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const browseBtn = document.getElementById('browseBtn') as HTMLButtonElement;
const fileInfo = document.getElementById('fileInfo') as HTMLDivElement;
const fileName = document.getElementById('fileName') as HTMLSpanElement;
const fileSize = document.getElementById('fileSize') as HTMLSpanElement;
const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
const fixChecksumCheckbox = document.getElementById('fixChecksumCheckbox') as HTMLInputElement;
const saveFilesContainer = document.getElementById('saveFilesContainer') as HTMLDivElement;

let currentFile: File | null = null;
let currentFileData: Uint8Array | null = null;

browseBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    handleFile(target.files[0]);
  }
});

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');

  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (file.name.endsWith('.sav')) {
      handleFile(file);
    } else {
      alert('Please upload a .sav file');
    }
  }
});

clearBtn.addEventListener('click', () => {
  currentFile = null;
  currentFileData = null;
  fileInput.value = '';
  uploadArea.style.display = 'block';
  fileInfo.style.display = 'none';
  saveFilesContainer.innerHTML = '';
});

downloadBtn.addEventListener('click', async () => {
  if (!currentFile || !currentFileData) {
    alert('No file loaded');
    return;
  }

  try {
    let data: Uint8Array<ArrayBuffer> = new Uint8Array(currentFileData);

    if (fixChecksumCheckbox.checked) {
      console.log('Fixing checksums for all 3 save slots...');
      data = updateChecksums(data);
      console.log('Checksums updated successfully');
    }

    const blob = new Blob([data.buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Error processing file:', error);
    alert('Error processing file. Check console for details.');
  }
});

async function handleFile(file: File) {
  if (!file.name.endsWith('.sav')) {
    alert('Please upload a .sav file');
    return;
  }

  currentFile = file;

  const arrayBuffer = await file.arrayBuffer();
  currentFileData = new Uint8Array(arrayBuffer);

  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);

  displaySaveFiles(currentFileData);

  uploadArea.style.display = 'none';
  fileInfo.style.display = 'block';

  console.log('File loaded:', file.name, file.size, 'bytes');
}

//file names have null bytes between each character
function readFileName(data: Uint8Array, offset: number, maxLength: number): string {
  let name = '';
  let i = offset;

  while (i < data.length && i < offset + (maxLength * 2)) {
    const charCode = data[i];

    //stop if we hit two consecutive null bytes
    if (charCode === 0 && (i + 1 >= data.length || data[i + 1] === 0)) {
      break;
    }

    if (charCode !== 0) {
      name += String.fromCharCode(charCode);
    }

    i++;
  }

  return name || 'Empty Slot';
}

function readStageString(data: Uint8Array, offset: number): string {
  let stage = '';
  for (let i = 0; i < 8; i++) {
    const charCode = data[offset + i];
    if (charCode === 0) break;
    stage += String.fromCharCode(charCode);
  }
  return stage;
}

function writeStageString(data: Uint8Array, offset: number, stage: string): void {
  for (let i = 0; i < 8; i++) {
    data[offset + i] = i < stage.length ? stage.charCodeAt(i) : 0;
  }
}

function writeFileName(data: Uint8Array, offset: number, name: string, maxLength: number): void {
  let writeIndex = offset;
  for (let i = 0; i < Math.min(name.length, maxLength); i++) {
    data[writeIndex] = name.charCodeAt(i);
    writeIndex++;
    if (i < name.length - 1) {
      data[writeIndex] = 0;
      writeIndex++;
    }
  }
  while (writeIndex < offset + (maxLength * 2)) {
    data[writeIndex] = 0;
    writeIndex++;
  }
}

const ITEMS = [
  { name: 'Empty', value: 0xFF },
  { name: 'Hero\'s Charm', value: 0x01 },
  { name: 'Telescope', value: 0x20 },
  { name: 'Tingle Bottle', value: 0x21 },
  { name: 'Wind Waker', value: 0x22 },
  { name: 'PictoBox', value: 0x23 },
  { name: 'Spoils Bag', value: 0x24 },
  { name: 'Grappling Hook', value: 0x25 },
  { name: 'Deluxe PictoBox', value: 0x26 },
  { name: 'Hero\'s Bow', value: 0x27 },
  { name: 'Power Bracelets', value: 0x28 },
  { name: 'Iron Boots', value: 0x29 },
  { name: 'Magic Armor', value: 0x2A },
  { name: 'Water Boots', value: 0x2B },
  { name: 'Bait Bag', value: 0x2C },
  { name: 'Boomerang', value: 0x2D },
  { name: 'Bare Hand', value: 0x2E },
  { name: 'Hookshot', value: 0x2F },
  { name: 'Delivery Bag', value: 0x30 },
  { name: 'Bombs', value: 0x31 },
  { name: 'Hero\'s Clothes', value: 0x32 },
  { name: 'Skull Hammer', value: 0x33 },
  { name: 'Deku Leaf', value: 0x34 },
  { name: 'Fire & Ice Arrows', value: 0x35 },
  { name: 'Light Arrows', value: 0x36 },
  { name: 'Hero\'s New Clothes', value: 0x37 },
  { name: 'Hero\'s Sword', value: 0x38 },
  { name: 'Master Sword', value: 0x39 },
  { name: 'Master Sword (Half Restored)', value: 0x3A },
  { name: 'Hero\'s Shield', value: 0x3B },
  { name: 'Mirror Shield', value: 0x3C },
  { name: 'Hero\'s Sword (Dropped)', value: 0x3D },
  { name: 'Master Sword (Full Restored)', value: 0x3E },
  { name: 'Piece of Heart (Alt)', value: 0x3F },
  { name: 'Unknown (0x40)', value: 0x40 },
  { name: 'Unknown (0x41)', value: 0x41 },
  { name: 'Pirate\'s Charm', value: 0x42 },
  { name: 'Hero\'s Charm (Alt)', value: 0x43 },
  { name: 'Grass Ball', value: 0x44 },
  { name: 'Skull Necklace', value: 0x45 },
  { name: 'Boko Baba Seed', value: 0x46 },
  { name: 'Golden Feather', value: 0x47 },
  { name: 'Knights Crest', value: 0x48 },
  { name: 'Red Chu Jelly', value: 0x49 },
  { name: 'Green Chu Jelly', value: 0x4A },
  { name: 'Blue Chu Jelly', value: 0x4B },
  { name: 'Dungeon Map', value: 0x4C },
  { name: 'Compass', value: 0x4D },
  { name: 'Big Key', value: 0x4E },
  { name: 'Empty Bottle', value: 0x4F },
  { name: 'Bottle (Empty)', value: 0x50 },
  { name: 'Red Potion', value: 0x51 },
  { name: 'Green Potion', value: 0x52 },
  { name: 'Blue Potion', value: 0x53 },
  { name: 'Soup (Half)', value: 0x54 },
  { name: 'Soup', value: 0x55 },
  { name: 'Water', value: 0x56 },
  { name: 'Fairy', value: 0x57 },
  { name: 'Fire Fly', value: 0x58 },
  { name: 'Magic Water', value: 0x59 }
];

function getItemName(value: number): string {
  const item = ITEMS.find(i => i.value === value);
  return item ? item.name : `Unknown (0x${value.toString(16).toUpperCase().padStart(2, '0')})`;
}

function displaySaveFiles(data: Uint8Array) {
  const fileOffsets = [
    { slot: 1, nameOffset: 0x2035, fileStart: 0x0 },
    { slot: 2, nameOffset: 0x2047, fileStart: 0xA94 },
    { slot: 3, nameOffset: 0x2059, fileStart: 0x1528 }
  ];

  saveFilesContainer.innerHTML = '';

  fileOffsets.forEach(({ slot, nameOffset, fileStart }, index) => {
    const maxNameLength = index < fileOffsets.length - 1
      ? (fileOffsets[index + 1].nameOffset - nameOffset) / 2
      : 9; //default to 9 characters for the last file

    const saveName = readFileName(data, nameOffset, maxNameLength);

    const stageOffset = fileStart + 0x30;
    const spawnIdOffset = fileStart + 0x38;
    const roomIdOffset = fileStart + 0x39;
    const layerIdOffset = fileStart + 0x3A;
    const inventoryOffset = fileStart + 0x3C;

    const stage = readStageString(data, stageOffset);
    const spawnId = data[spawnIdOffset];
    const roomId = data[roomIdOffset];
    const layerId = data[layerIdOffset];

    const dropdown = document.createElement('details');
    dropdown.className = 'save-file-dropdown';

    const summary = document.createElement('summary');
    summary.textContent = `File ${slot}: ${saveName}`;

    const content = document.createElement('div');
    content.className = 'dropdown-content';

    const nameContainer = document.createElement('div');
    nameContainer.className = 'control-group';
    nameContainer.innerHTML = `
      <label for="filename-${slot}">
        <span>File Name:</span>
        <input 
          type="text" 
          id="filename-${slot}" 
          class="text-input" 
          maxlength="${maxNameLength}"
          value="${saveName}"
          data-offset="${nameOffset}"
          data-maxlength="${maxNameLength}"
        />
      </label>
    `;

    const stageContainer = document.createElement('div');
    stageContainer.className = 'control-group';
    stageContainer.innerHTML = `
      <label for="stage-${slot}">
        <span>Stage:</span>
        <input 
          type="text" 
          id="stage-${slot}" 
          class="text-input" 
          maxlength="8"
          value="${stage}"
          data-offset="${stageOffset}"
        />
      </label>
    `;

    const spawnContainer = document.createElement('div');
    spawnContainer.className = 'control-group';
    spawnContainer.innerHTML = `
      <label for="spawn-${slot}">
        <span>Spawn ID:</span>
        <div class="input-group">
          <input 
            type="number" 
            id="spawn-${slot}" 
            class="number-input" 
            min="0" 
            max="255" 
            value="${spawnId}"
            data-offset="${spawnIdOffset}"
          />
          <span class="hex-display">0x${spawnId.toString(16).toUpperCase().padStart(2, '0')}</span>
        </div>
      </label>
    `;

    const roomContainer = document.createElement('div');
    roomContainer.className = 'control-group';
    roomContainer.innerHTML = `
      <label for="room-${slot}">
        <span>Room ID:</span>
        <div class="input-group">
          <input 
            type="number" 
            id="room-${slot}" 
            class="number-input" 
            min="0" 
            max="255" 
            value="${roomId}"
            data-offset="${roomIdOffset}"
          />
          <span class="hex-display">0x${roomId.toString(16).toUpperCase().padStart(2, '0')}</span>
        </div>
      </label>
    `;

    const layerContainer = document.createElement('div');
    layerContainer.className = 'control-group';
    layerContainer.innerHTML = `
      <label for="layer-${slot}">
        <span>Layer ID:</span>
        <div class="input-group">
          <input 
            type="number" 
            id="layer-${slot}" 
            class="number-input" 
            min="0" 
            max="255" 
            value="${layerId}"
            data-offset="${layerIdOffset}"
          />
          <span class="hex-display">0x${layerId.toString(16).toUpperCase().padStart(2, '0')}</span>
        </div>
      </label>
    `;

    content.appendChild(nameContainer);
    content.appendChild(stageContainer);
    content.appendChild(spawnContainer);
    content.appendChild(roomContainer);
    content.appendChild(layerContainer);

    // Inventory Section
    const inventorySection = document.createElement('div');
    inventorySection.className = 'control-group';
    inventorySection.innerHTML = `
      <label>
        <span>Inventory (21 slots):</span>
      </label>
    `;

    const inventoryGrid = document.createElement('div');
    inventoryGrid.className = 'inventory-grid';
    inventoryGrid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px;';

    // Create 21 inventory slot dropdowns
    for (let slotIndex = 0; slotIndex < 21; slotIndex++) {
      const slotOffset = inventoryOffset + slotIndex;
      const currentItemValue = data[slotOffset];

      const slotContainer = document.createElement('div');
      slotContainer.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

      const slotLabel = document.createElement('label');
      slotLabel.style.cssText = 'font-size: 0.8rem; color: var(--text-secondary);';
      slotLabel.textContent = `Slot ${slotIndex + 1}`;

      const select = document.createElement('select');
      select.className = 'item-select';
      select.id = `inventory-${slot}-${slotIndex}`;
      select.style.cssText = `
        padding: 6px 8px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 4px;
        color: var(--text);
        font-size: 0.75rem;
        font-family: 'Consolas', 'Courier New', monospace;
        cursor: pointer;
        -webkit-font-smoothing: none;
        -moz-osx-font-smoothing: grayscale;
      `;

      // Populate dropdown with items
      ITEMS.forEach(item => {
        const option = document.createElement('option');
        option.value = item.value.toString();
        option.textContent = item.name;
        if (item.value === currentItemValue) {
          option.selected = true;
        }
        select.appendChild(option);
      });

      // Add event listener to update inventory
      select.addEventListener('change', () => {
        const newValue = parseInt(select.value);
        if (currentFileData) {
          currentFileData[slotOffset] = newValue;
          console.log(`Updated File ${slot} inventory slot ${slotIndex + 1} to ${getItemName(newValue)} (0x${newValue.toString(16).toUpperCase().padStart(2, '0')}) at offset 0x${slotOffset.toString(16).toUpperCase()}`);
        }
      });

      slotContainer.appendChild(slotLabel);
      slotContainer.appendChild(select);
      inventoryGrid.appendChild(slotContainer);
    }

    inventorySection.appendChild(inventoryGrid);
    content.appendChild(inventorySection);

    //event listeners
    const nameInput = nameContainer.querySelector(`#filename-${slot}`) as HTMLInputElement;
    nameInput.addEventListener('input', () => {
      const newName = nameInput.value;
      if (currentFileData) {
        writeFileName(currentFileData, nameOffset, newName, maxNameLength);
        summary.textContent = `File ${slot}: ${newName}`;
        console.log(`Updated File ${slot} name to "${newName}" at offset 0x${nameOffset.toString(16).toUpperCase()}`);
      }
    });

    const stageInput = stageContainer.querySelector(`#stage-${slot}`) as HTMLInputElement;
    stageInput.addEventListener('input', () => {
      const newStage = stageInput.value.substring(0, 8); // Max 8 characters
      stageInput.value = newStage;
      if (currentFileData) {
        writeStageString(currentFileData, stageOffset, newStage);
        console.log(`Updated File ${slot} stage to "${newStage}" at offset 0x${stageOffset.toString(16).toUpperCase()}`);
      }
    });

    const spawnInput = spawnContainer.querySelector(`#spawn-${slot}`) as HTMLInputElement;
    const spawnHex = spawnContainer.querySelector('.hex-display') as HTMLSpanElement;
    spawnInput.addEventListener('input', () => {
      let value = parseInt(spawnInput.value);
      if (value < 0) value = 0;
      if (value > 255) value = 255;
      if (isNaN(value)) value = 0;

      spawnInput.value = value.toString();
      spawnHex.textContent = `0x${value.toString(16).toUpperCase().padStart(2, '0')}`;

      if (currentFileData) {
        currentFileData[spawnIdOffset] = value;
        console.log(`Updated File ${slot} spawn ID to ${value} (0x${value.toString(16).toUpperCase()}) at offset 0x${spawnIdOffset.toString(16).toUpperCase()}`);
      }
    });

    const roomInput = roomContainer.querySelector(`#room-${slot}`) as HTMLInputElement;
    const roomHex = roomContainer.querySelector('.hex-display') as HTMLSpanElement;
    roomInput.addEventListener('input', () => {
      let value = parseInt(roomInput.value);
      if (value < 0) value = 0;
      if (value > 255) value = 255;
      if (isNaN(value)) value = 0;

      roomInput.value = value.toString();
      roomHex.textContent = `0x${value.toString(16).toUpperCase().padStart(2, '0')}`;

      if (currentFileData) {
        currentFileData[roomIdOffset] = value;
        console.log(`Updated File ${slot} room ID to ${value} (0x${value.toString(16).toUpperCase()}) at offset 0x${roomIdOffset.toString(16).toUpperCase()}`);
      }
    });

    // Layer ID
    const layerInput = layerContainer.querySelector(`#layer-${slot}`) as HTMLInputElement;
    const layerHex = layerContainer.querySelector('.hex-display') as HTMLSpanElement;
    layerInput.addEventListener('input', () => {
      let value = parseInt(layerInput.value);
      if (value < 0) value = 0;
      if (value > 255) value = 255;
      if (isNaN(value)) value = 0;

      layerInput.value = value.toString();
      layerHex.textContent = `0x${value.toString(16).toUpperCase().padStart(2, '0')}`;

      if (currentFileData) {
        currentFileData[layerIdOffset] = value;
        console.log(`Updated File ${slot} layer ID to ${value} (0x${value.toString(16).toUpperCase()}) at offset 0x${layerIdOffset.toString(16).toUpperCase()}`);
      }
    });

    dropdown.appendChild(summary);
    dropdown.appendChild(content);
    saveFilesContainer.appendChild(dropdown);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
