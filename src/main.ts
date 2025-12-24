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

// Browse button click
browseBtn.addEventListener('click', () => {
  fileInput.click();
});

// File input change
fileInput.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    handleFile(target.files[0]);
  }
});

// Drag and drop
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

// Clear button
clearBtn.addEventListener('click', () => {
  currentFile = null;
  currentFileData = null;
  fileInput.value = '';
  uploadArea.style.display = 'block';
  fileInfo.style.display = 'none';
  saveFilesContainer.innerHTML = '';
});

// Download button
downloadBtn.addEventListener('click', async () => {
  if (!currentFile || !currentFileData) {
    alert('No file loaded');
    return;
  }
  
  try {
    // Create a copy of the data to modify
    let data: Uint8Array<ArrayBuffer> = new Uint8Array(currentFileData);
    
    // Apply checksum fix if checkbox is checked
    if (fixChecksumCheckbox.checked) {
      console.log('Fixing checksums for all 3 save slots...');
      data = updateChecksums(data);
      console.log('Checksums updated successfully');
    }
    
    // Create a blob and download it
    const blob = new Blob([data.buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('File downloaded:', currentFile.name);
  } catch (error) {
    console.error('Error processing file:', error);
    alert('Error processing file. Check console for details.');
  }
});

// Handle file
async function handleFile(file: File) {
  if (!file.name.endsWith('.sav')) {
    alert('Please upload a .sav file');
    return;
  }
  
  currentFile = file;
  
  // Read file data
  const arrayBuffer = await file.arrayBuffer();
  currentFileData = new Uint8Array(arrayBuffer);
  
  // Update UI
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  
  // Display save file dropdowns
  displaySaveFiles(currentFileData);
  
  uploadArea.style.display = 'none';
  fileInfo.style.display = 'block';
  
  console.log('File loaded:', file.name, file.size, 'bytes');
}

// Read file name from save data at specified offset
// File names have null bytes (0x00) between each character
function readFileName(data: Uint8Array, offset: number, maxLength: number): string {
  let name = '';
  let i = offset;
  
  // Read characters, skipping null bytes between them
  while (i < data.length && i < offset + (maxLength * 2)) {
    const charCode = data[i];
    
    // Stop if we hit two consecutive null bytes (end of string)
    if (charCode === 0 && (i + 1 >= data.length || data[i + 1] === 0)) {
      break;
    }
    
    // Add the character if it's not a null byte
    if (charCode !== 0) {
      name += String.fromCharCode(charCode);
    }
    
    i++;
  }
  
  return name || 'Empty Slot';
}

// Display save file dropdowns
function displaySaveFiles(data: Uint8Array) {
  const fileOffsets = [
    { slot: 1, offset: 0x2035 },
    { slot: 2, offset: 0x2047 },
    { slot: 3, offset: 0x2059 }
  ];
  
  saveFilesContainer.innerHTML = '';
  
  fileOffsets.forEach(({ slot, offset }, index) => {
    // Calculate max name length based on distance to next offset
    // 0x2047 - 0x2035 = 0x12 (18 bytes), so 9 characters with null bytes between
    const maxNameLength = index < fileOffsets.length - 1 
      ? (fileOffsets[index + 1].offset - offset) / 2 
      : 9; // Default to 9 characters for the last file
    
    const saveName = readFileName(data, offset, maxNameLength);
    
    const dropdown = document.createElement('details');
    dropdown.className = 'save-file-dropdown';
    
    const summary = document.createElement('summary');
    summary.textContent = `File ${slot}: ${saveName}`;
    
    const content = document.createElement('div');
    content.className = 'dropdown-content';
    content.innerHTML = `
      <p>File Name: <strong>${saveName}</strong></p>
      <p>Offset: 0x${offset.toString(16).toUpperCase()}</p>
      <p class="placeholder-text">Controls coming soon...</p>
    `;
    
    dropdown.appendChild(summary);
    dropdown.appendChild(content);
    saveFilesContainer.appendChild(dropdown);
  });
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
