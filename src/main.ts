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

// Elements
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
    
    const entranceIdOffset = fileStart + 0x38;
    const entranceId = data[entranceIdOffset];
    
    const dropdown = document.createElement('details');
    dropdown.className = 'save-file-dropdown';
    
    const summary = document.createElement('summary');
    summary.textContent = `File ${slot}: ${saveName}`;
    
    const content = document.createElement('div');
    content.className = 'dropdown-content';
    
    const entranceContainer = document.createElement('div');
    entranceContainer.className = 'entrance-control';
    entranceContainer.innerHTML = `
      <label for="entrance-${slot}">
        <span>Entrance ID:</span>
        <div class="input-group">
          <input 
            type="number" 
            id="entrance-${slot}" 
            class="entrance-input" 
            min="0" 
            max="255" 
            value="${entranceId}"
            data-offset="${entranceIdOffset}"
          />
          <span class="hex-display">0x${entranceId.toString(16).toUpperCase().padStart(2, '0')}</span>
        </div>
      </label>
    `;
    
    const infoText = document.createElement('p');
    infoText.className = 'info-text';
    infoText.innerHTML = `<strong>File Name:</strong> ${saveName}<br><strong>Name Offset:</strong> 0x${nameOffset.toString(16).toUpperCase()}`;
    
    content.appendChild(infoText);
    content.appendChild(entranceContainer);
    
    const input = entranceContainer.querySelector(`#entrance-${slot}`) as HTMLInputElement;
    const hexDisplay = entranceContainer.querySelector('.hex-display') as HTMLSpanElement;
    
    input.addEventListener('input', () => {
      let value = parseInt(input.value);
      
      if (value < 0) value = 0;
      if (value > 255) value = 255;
      if (isNaN(value)) value = 0;
      
      input.value = value.toString();
      hexDisplay.textContent = `0x${value.toString(16).toUpperCase().padStart(2, '0')}`;
      
      if (currentFileData) {
        currentFileData[entranceIdOffset] = value;
        console.log(`Updated File ${slot} entrance ID to ${value} (0x${value.toString(16).toUpperCase()}) at offset 0x${entranceIdOffset.toString(16).toUpperCase()}`);
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
