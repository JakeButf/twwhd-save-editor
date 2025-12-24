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

let currentFile: File | null = null;

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
  fileInput.value = '';
  uploadArea.style.display = 'block';
  fileInfo.style.display = 'none';
});

// Download button
downloadBtn.addEventListener('click', async () => {
  if (!currentFile) {
    alert('No file loaded');
    return;
  }
  
  try {
    // Read the file as an ArrayBuffer
    const arrayBuffer = await currentFile.arrayBuffer();
    let data: Uint8Array<ArrayBuffer> = new Uint8Array(arrayBuffer);
    
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
function handleFile(file: File) {
  if (!file.name.endsWith('.sav')) {
    alert('Please upload a .sav file');
    return;
  }
  
  currentFile = file;
  
  // Update UI
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  
  uploadArea.style.display = 'none';
  fileInfo.style.display = 'block';
  
  console.log('File loaded:', file.name, file.size, 'bytes');
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
