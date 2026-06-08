/**
 * Main Application Logic - Project Portfolio Builder
 */

// Application State
let portfolioData = null;
let isEditMode = false;
let currentProjectKey = null;
let activeModalSkills = [];
let activeModalLinks = [];

// Helper functions for nested object access
function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  const lastPart = parts.pop();
  const parent = parts.reduce((acc, part) => {
    if (!acc[part]) acc[part] = {};
    return acc[part];
  }, obj);
  parent[lastPart] = value;
}

// Show/Hide Floating Save Changes button in Header
function showSaveButton() {
  const saveBtn = document.getElementById('saveAllBtn');
  if (saveBtn) {
    saveBtn.classList.remove('hide');
  }
}

function hideSaveButton() {
  const saveBtn = document.getElementById('saveAllBtn');
  if (saveBtn) {
    saveBtn.classList.add('hide');
  }
}

// Format raw text for HTML output (handles newlines)
function formatParagraphs(text) {
  if (!text) return '';
  return text
    .split('\n')
    .filter(para => para.trim() !== '')
    .map(para => `<p>${para.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('');
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  try {
    // Check if edit parameter is present in URL to show Editor Toggle
    const urlParams = new URLSearchParams(window.location.search);
    const hasEditAccess = urlParams.get('edit') === 'true';
    if (hasEditAccess) {
      const modeSwitch = document.getElementById('modeSwitchWrapper');
      if (modeSwitch) {
        modeSwitch.classList.remove('hide');
      }
    }

    // Load initial portfolio configuration (loads relatively to support subdirectory paths)
    const response = await fetch('./portfolio-data.json');
    if (!response.ok) {
      throw new Error('Failed to load portfolio database.');
    }
    portfolioData = await response.json();

    // Render components
    renderProfile();
    renderProjectsGrid();
    renderRoadmap();

    // Set up event listeners
    setupEventListeners();

    // Initialize Lucide Icons
    lucide.createIcons();

  } catch (error) {
    console.error(error);
    showToast(error.message, 'error');
  }
}

// Render Profile details
function renderProfile() {
  if (!portfolioData) return;

  const profile = portfolioData.profile;

  // Name, Title, Bio
  const nameEl = document.getElementById('profileName');
  const titleEl = document.getElementById('profileTitle');
  const bioEl = document.getElementById('profileBio');

  nameEl.innerHTML = profile.name || nameEl.getAttribute('data-placeholder');
  titleEl.innerHTML = profile.title || titleEl.getAttribute('data-placeholder');
  bioEl.innerHTML = profile.bio || bioEl.getAttribute('data-placeholder');

  // Configure inline editable fields in state
  configureInlineEditing(nameEl, 'profile.name', false);
  configureInlineEditing(titleEl, 'profile.title', false);
  configureInlineEditing(bioEl, 'profile.bio', true);

  // Avatar Loading
  const avatarImage = document.getElementById('avatarImage');
  const avatarFallback = document.getElementById('avatarFallback');

  if (profile.avatar) {
    avatarImage.src = profile.avatar;
    avatarImage.classList.remove('hide');
    avatarFallback.classList.add('hide');
  } else {
    avatarImage.classList.add('hide');
    avatarFallback.classList.remove('hide');
    // Set fallback initials
    if (profile.name) {
      const parts = profile.name.trim().split(/\s+/);
      const initials = parts.length > 1 
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].substring(0, 2).toUpperCase();
      avatarFallback.innerText = initials;
    } else {
      avatarFallback.innerText = 'CV';
    }
  }

  // Render Contact Links
  renderContactLinks();
}

// Render contact badges or forms
function renderContactLinks() {
  const container = document.getElementById('contactLinksContainer');
  container.innerHTML = '';

  const links = portfolioData.profile.links || {};

  // In Edit Mode, we render the edit fields inside the grid
  if (isEditMode) {
    const editForm = document.createElement('div');
    editForm.className = 'links-editor-form';
    editForm.innerHTML = `
      <div class="link-editor-field">
        <label>Email</label>
        <input type="email" class="link-editor-input" data-key="email" value="${links.email || ''}" placeholder="example@email.com">
      </div>
      <div class="link-editor-field">
        <label>Phone</label>
        <input type="text" class="link-editor-input" data-key="phone" value="${links.phone || ''}" placeholder="0901234567">
      </div>
      <div class="link-editor-field">
        <label>GitHub</label>
        <input type="url" class="link-editor-input" data-key="github" value="${links.github || ''}" placeholder="https://github.com/username">
      </div>
      <div class="link-editor-field">
        <label>LinkedIn</label>
        <input type="url" class="link-editor-input" data-key="linkedin" value="${links.linkedin || ''}" placeholder="https://linkedin.com/in/username">
      </div>
      <div class="link-editor-field">
        <label>Website</label>
        <input type="url" class="link-editor-input" data-key="website" value="${links.website || ''}" placeholder="https://mywebsite.dev">
      </div>
    `;

    // Listen to changes on inputs
    editForm.querySelectorAll('.link-editor-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const key = e.target.getAttribute('data-key');
        portfolioData.profile.links[key] = e.target.value.trim();
        showSaveButton();
      });
    });

    container.appendChild(editForm);
  } else {
    // Viewer mode contact badges
    const items = [
      { key: 'email', icon: 'mail', prefix: 'mailto:', label: links.email },
      { key: 'phone', icon: 'phone', prefix: 'tel:', label: links.phone },
      { key: 'github', icon: 'github', prefix: '', label: links.github },
      { key: 'linkedin', icon: 'linkedin', prefix: '', label: links.linkedin },
      { key: 'website', icon: 'globe', prefix: '', label: links.website }
    ];

    items.forEach(item => {
      if (item.label) {
        const linkEl = document.createElement('a');
        linkEl.className = 'contact-item';
        linkEl.href = item.prefix + item.label;
        linkEl.target = item.key === 'github' || item.key === 'linkedin' || item.key === 'website' ? '_blank' : '_self';
        linkEl.innerHTML = `<i data-lucide="${item.icon}"></i> <span>${item.label}</span>`;
        container.appendChild(linkEl);
      }
    });

    lucide.createIcons();
  }
}

// Render dynamic project cards grid
function renderProjectsGrid() {
  const grid = document.getElementById('projectsGrid');
  grid.innerHTML = '';

  const projects = portfolioData.projects || {};
  const projectKeys = Object.keys(projects);

  projectKeys.forEach(key => {
    const project = projects[key];
    const card = document.createElement('div');
    card.className = 'project-card';
    card.setAttribute('data-project-key', key);

    // Prepare skills badges
    const skillsHtml = (project.skills || [])
      .slice(0, 3) // show max 3 tags on preview card
      .map(skill => `<span class="skill-badge">${skill}</span>`)
      .join('');
    
    // Custom links indicator count
    const linksCount = (project.customLinks || []).length;
    const skillsRemaining = (project.skills || []).length - 3;
    const remainingBadge = skillsRemaining > 0 ? `<span class="skill-badge">+${skillsRemaining}</span>` : '';

    card.innerHTML = `
      <!-- Hover Edit Icon -->
      <div class="edit-indicator">
        <i data-lucide="edit-3"></i>
      </div>
      
      <div class="project-card-header">
        <h3 class="project-card-title">${project.title || key}</h3>
        <div class="project-card-icon">
          <i data-lucide="folder-git-2"></i>
        </div>
      </div>
      
      <div class="project-card-subtitle">${project.subtitle || 'Dự án Phát triển'}</div>
      
      <p class="project-card-desc">${project.description || 'Chưa có mô tả chi tiết cho dự án này.'}</p>
      
      <div class="project-card-skills">
        ${skillsHtml}
        ${remainingBadge}
      </div>
      
      <div class="project-card-footer">
        <span class="project-card-link-count">
          <i data-lucide="link"></i>
          <span>${linksCount} Liên kết</span>
        </span>
        <span class="project-card-action">
          Xem chi tiết
          <i data-lucide="arrow-right"></i>
        </span>
      </div>
    `;

    // Click handler to open project details
    card.addEventListener('click', () => {
      openProjectDetails(key);
    });

    grid.appendChild(card);
  });

  // Append create project card in edit mode
  if (isEditMode) {
    const addCard = document.createElement('div');
    addCard.className = 'project-card-add';
    addCard.innerHTML = `
      <div class="project-card-add-icon">
        <i data-lucide="plus"></i>
      </div>
      <span class="project-card-add-text">Thêm dự án mới</span>
      <span class="project-card-add-sub">Đồng bộ tự động tệp tin trong thư mục dự án cục bộ</span>
    `;
    addCard.addEventListener('click', () => {
      handleAddProjectClick();
    });
    grid.appendChild(addCard);
  }

  if (projectKeys.length === 0 && !isEditMode) {
    grid.innerHTML = '<div class="no-files-placeholder">Chưa có dự án nào được tạo.</div>';
  }

  lucide.createIcons();
}

// In-place inline editing configurations
function configureInlineEditing(element, fieldPath, isTextArea = false) {
  element.addEventListener('click', (e) => {
    if (!isEditMode) return;
    if (element.querySelector('input, textarea')) return; // already active

    const currentValue = getNestedValue(portfolioData, fieldPath) || '';
    let inputEl;

    if (isTextArea) {
      inputEl = document.createElement('textarea');
      inputEl.className = 'active-inline-textarea';
      inputEl.value = currentValue;
      inputEl.placeholder = element.getAttribute('data-placeholder') || '';
    } else {
      inputEl = document.createElement('input');
      inputEl.className = 'active-inline-input';
      inputEl.type = 'text';
      inputEl.value = currentValue;
      inputEl.placeholder = element.getAttribute('data-placeholder') || '';
    }

    element.innerHTML = '';
    element.appendChild(inputEl);
    inputEl.focus();

    const finishEdit = () => {
      const newValue = inputEl.value.trim();
      setNestedValue(portfolioData, fieldPath, newValue);
      element.innerHTML = newValue || element.getAttribute('data-placeholder') || '';
      showSaveButton();
    };

    // Save on blur
    inputEl.addEventListener('blur', finishEdit);
    
    // Save on Enter (for inputs)
    if (!isTextArea) {
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          inputEl.blur();
        }
      });
    }
  });
}

// Setup global event listeners
function setupEventListeners() {
  // Mode toggle Btn
  const modeToggle = document.getElementById('modeToggle');
  modeToggle.addEventListener('click', () => {
    toggleMode();
  });

  // Global Save Btn in Header
  const saveAllBtn = document.getElementById('saveAllBtn');
  saveAllBtn.addEventListener('click', () => {
    saveAllChangesToDisk();
  });

  // Modal close btn
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('projectModal').addEventListener('click', (e) => {
    if (e.target.id === 'projectModal') {
      closeModal();
    }
  });

  // Modal Editor triggers
  document.getElementById('modalSaveBtn').addEventListener('click', saveProjectChanges);
  document.getElementById('modalDiscardBtn').addEventListener('click', closeModal);

  // Add skill button in modal
  document.getElementById('addSkillBtn').addEventListener('click', handleAddSkillInModal);
  document.getElementById('newSkillInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkillInModal();
    }
  });

  // Add Link button in modal
  document.getElementById('addLinkBtn').addEventListener('click', handleAddLinkInModal);

  // Avatar Upload Events
  const avatarUploadArea = document.getElementById('avatarUploadArea');
  const avatarInput = document.getElementById('avatarInput');

  avatarUploadArea.addEventListener('click', () => {
    if (isEditMode) {
      avatarInput.click();
    }
  });

  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadAvatarFile(file);
    }
  });

  // Roadmap Inputs change events
  const shortInput = document.getElementById('roadmapShortTermInput');
  const longInput = document.getElementById('roadmapLongTermInput');
  
  shortInput.addEventListener('input', (e) => {
    portfolioData.roadmap.shortTerm = e.target.value;
    showSaveButton();
  });
  longInput.addEventListener('input', (e) => {
    portfolioData.roadmap.longTerm = e.target.value;
    showSaveButton();
  });
}

// Toggle Mode: Viewer vs Editor
function toggleMode() {
  isEditMode = !isEditMode;

  const modeToggle = document.getElementById('modeToggle');
  const viewerLabel = document.querySelector('.viewer-label');
  const editorLabel = document.querySelector('.editor-label');
  const contentBody = document.body;

  if (isEditMode) {
    modeToggle.classList.add('active');
    editorLabel.classList.add('active');
    viewerLabel.classList.remove('active');
    contentBody.classList.add('edit-mode-active');
    showToast('Đã chuyển sang Chế độ Chỉnh sửa', 'info');
  } else {
    modeToggle.classList.remove('active');
    editorLabel.classList.remove('active');
    viewerLabel.classList.add('active');
    contentBody.classList.remove('edit-mode-active');
    showToast('Đã quay lại Chế độ Người xem', 'info');
  }

  // Refresh profile fields & links
  renderProfile();
  renderProjectsGrid();
  renderRoadmap();
}

// Open Detailed Project Modal
async function openProjectDetails(projectKey) {
  currentProjectKey = projectKey;
  const project = portfolioData.projects[projectKey];

  if (!project) return;

  // Set titles
  document.getElementById('modalProjectTitle').innerText = project.title || projectKey;
  document.getElementById('modalProjectSubtitle').innerText = project.subtitle || 'Dự án Phát triển';

  // Bind title editor inputs
  const titleInput = document.getElementById('projectTitleInput');
  const subtitleInput = document.getElementById('projectSubtitleInput');
  titleInput.value = project.title || projectKey;
  subtitleInput.value = project.subtitle || '';

  // Copy skills & links to working lists
  activeModalSkills = [...(project.skills || [])];
  activeModalLinks = (project.customLinks || []).map(link => ({ ...link }));

  // Set up descriptions
  const descViewer = document.getElementById('modalDescViewer');
  const descInput = document.getElementById('projectDescInput');

  descViewer.innerHTML = formatParagraphs(project.description);
  descInput.value = project.description || '';

  // Render Modal Sub-Sections
  renderModalSkills();
  renderModalLinks();

  // Fetch local project directory files
  renderProjectFilesList(projectKey);

  // Toggle editor views inside modal based on Mode
  const modalFooter = document.getElementById('modalFooter');
  const modalDescViewer = document.getElementById('modalDescViewer');
  const modalDescEditor = document.getElementById('modalDescEditor');
  const modalSkillsViewer = document.getElementById('modalSkillsViewer');
  const modalSkillsEditor = document.getElementById('modalSkillsEditor');
  const externalLinksViewer = document.getElementById('externalLinksViewer');
  const externalLinksEditor = document.getElementById('externalLinksEditor');
  const modalHeaderViewer = document.getElementById('modalHeaderViewer');
  const modalHeaderEditor = document.getElementById('modalHeaderEditor');

  if (isEditMode) {
    modalFooter.classList.remove('hide');
    modalDescViewer.classList.add('hide');
    modalDescEditor.classList.remove('hide');
    modalSkillsViewer.classList.add('hide');
    modalSkillsEditor.classList.remove('hide');
    externalLinksViewer.classList.add('hide');
    externalLinksEditor.classList.remove('hide');
    modalHeaderViewer.classList.add('hide');
    modalHeaderEditor.classList.remove('hide');
  } else {
    modalFooter.classList.add('hide');
    modalDescViewer.classList.remove('hide');
    modalDescEditor.classList.add('hide');
    modalSkillsViewer.classList.remove('hide');
    modalSkillsEditor.classList.add('hide');
    externalLinksViewer.classList.remove('hide');
    externalLinksEditor.classList.add('hide');
    modalHeaderViewer.classList.remove('hide');
    modalHeaderEditor.classList.add('hide');

    // Hide links section entirely if empty in viewer mode
    const linksSection = document.getElementById('externalLinksSection');
    if (activeModalLinks.length === 0) {
      linksSection.classList.add('hide');
    } else {
      linksSection.classList.remove('hide');
    }
  }

  // Open modal
  const modal = document.getElementById('projectModal');
  modal.classList.remove('hide');
  document.body.style.overflow = 'hidden'; // prevent page scroll behind modal

  lucide.createIcons();
}

// Close Modal
function closeModal() {
  const modal = document.getElementById('projectModal');
  modal.classList.add('hide');
  document.body.style.overflow = '';
}

// Save Project configurations (locally in memory)
function saveProjectChanges() {
  if (!currentProjectKey) return;

  const project = portfolioData.projects[currentProjectKey];
  if (!project) return;

  // Save title and subtitle
  const titleInputVal = document.getElementById('projectTitleInput').value.trim();
  const subtitleInputVal = document.getElementById('projectSubtitleInput').value.trim();
  project.title = titleInputVal || currentProjectKey;
  project.subtitle = subtitleInputVal || 'Dự án Phát triển';

  // Save description
  project.description = document.getElementById('projectDescInput').value.trim();

  // Save skills
  project.skills = [...activeModalSkills];

  // Read and save external links
  const links = [];
  const rows = document.querySelectorAll('.link-row');
  rows.forEach(row => {
    const name = row.querySelector('.link-name-input').value.trim();
    const url = row.querySelector('.link-url-input').value.trim();
    if (name && url) {
      links.push({ name, url });
    }
  });
  project.customLinks = links;

  // Refresh Grid & Close Modal
  renderProjectsGrid();
  closeModal();

  showToast(`Đã lưu thay đổi cho dự án "${project.title || currentProjectKey}" vào bộ nhớ tạm.`, 'success');
  showSaveButton();
}

// Render skills tag arrays in modal
function renderModalSkills() {
  const viewerContainer = document.getElementById('modalSkillsViewer');
  const editorContainer = document.getElementById('modalSkillsEditorTags');

  viewerContainer.innerHTML = '';
  editorContainer.innerHTML = '';

  activeModalSkills.forEach((skill, index) => {
    // Viewer Badges
    const badgeViewer = document.createElement('span');
    badgeViewer.className = 'skill-tag-large';
    badgeViewer.innerText = skill;
    viewerContainer.appendChild(badgeViewer);

    // Editor Badges (with delete controls)
    const badgeEditor = document.createElement('span');
    badgeEditor.className = 'skill-tag-large';
    badgeEditor.innerHTML = `
      <span>${skill}</span>
      <button class="remove-tag-btn" data-index="${index}" title="Remove skill">
        <i data-lucide="x"></i>
      </button>
    `;
    editorContainer.appendChild(badgeEditor);
  });

  // Attach delete events
  editorContainer.querySelectorAll('.remove-tag-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.getAttribute('data-index'));
      activeModalSkills.splice(idx, 1);
      renderModalSkills();
    });
  });

  lucide.createIcons();
}

// Add custom tag inside project editor modal
function handleAddSkillInModal() {
  const input = document.getElementById('newSkillInput');
  const skill = input.value.trim();
  if (skill && !activeModalSkills.includes(skill)) {
    activeModalSkills.push(skill);
    input.value = '';
    renderModalSkills();
  }
}

// Render external references links in Modal
function renderModalLinks() {
  const viewerContainer = document.getElementById('externalLinksViewer');
  const inputsList = document.getElementById('linkInputsList');

  viewerContainer.innerHTML = '';
  inputsList.innerHTML = '';

  // Render Viewer badges
  activeModalLinks.forEach((link) => {
    const linkBadge = document.createElement('a');
    linkBadge.className = 'external-link-badge';
    linkBadge.href = link.url;
    linkBadge.target = '_blank';
    linkBadge.innerHTML = `
      <i data-lucide="link-2"></i>
      <span>${link.name}</span>
    `;
    viewerContainer.appendChild(linkBadge);
  });

  // Render Editor rows
  activeModalLinks.forEach((link, index) => {
    addLinkInputRow(link.name, link.url, index);
  });

  lucide.createIcons();
}

// Helper to spawn Link Edit Row in Modal
function addLinkInputRow(name = '', url = '', index = null) {
  const list = document.getElementById('linkInputsList');
  const row = document.createElement('div');
  row.className = 'link-row';
  row.innerHTML = `
    <input type="text" class="link-name-input" placeholder="Tên Link (vd: Source Code)" value="${name}">
    <input type="url" class="link-url-input" placeholder="Đường dẫn URL" value="${url}">
    <button class="remove-link-btn" title="Remove Link">
      <i data-lucide="trash-2"></i>
    </button>
  `;

  row.querySelector('.remove-link-btn').addEventListener('click', () => {
    row.remove();
  });

  list.appendChild(row);
  lucide.createIcons();
}

// Trigger custom link input row creation
function handleAddLinkInModal() {
  addLinkInputRow('', '');
}

// Scan and render files from project sub-directories
async function renderProjectFilesList(projectKey) {
  const filesList = document.getElementById('projectFilesList');
  
  // 1. First, check if project files are already embedded in the portfolio data (for static hosting)
  const project = portfolioData.projects[projectKey];
  if (project && project.files && project.files.length > 0) {
    displayFilesList(project.files);
    return;
  }

  // 2. Otherwise, if running locally, scan directory using the backend API
  filesList.innerHTML = `
    <div class="loading-state" style="padding:20px 0;">
      <div class="spinner" style="width:24px; height:24px; border-width:2px;"></div>
      <p style="font-size:0.75rem;">Đang quét tài liệu...</p>
    </div>
  `;

  try {
    const response = await fetch(`./api/project-files?name=${encodeURIComponent(projectKey)}`);
    if (!response.ok) {
      throw new Error('Failed to load project files.');
    }
    const data = await response.json();
    const files = data.files || [];
    displayFilesList(files);
  } catch (error) {
    console.error(error);
    filesList.innerHTML = '<div class="no-files-placeholder">Không tìm thấy tệp tin báo cáo nào trong thư mục dự án này.</div>';
  }
}

// Render files list template
function displayFilesList(files) {
  const filesList = document.getElementById('projectFilesList');
  filesList.innerHTML = '';

  if (!files || files.length === 0) {
    filesList.innerHTML = '<div class="no-files-placeholder">Không tìm thấy tệp tin báo cáo nào trong thư mục dự án này.</div>';
    return;
  }

  files.forEach(file => {
    // Choose file icon based on extension
    let icon = 'file';
    const name = file.name.toLowerCase();
    
    if (name.endsWith('.pdf')) icon = 'file-text';
    else if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z')) icon = 'archive';
    else if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif')) icon = 'image';
    else if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) icon = 'table';
    else if (name.endsWith('.doc') || name.endsWith('.docx')) icon = 'file-type';

    const fileItem = document.createElement('a');
    fileItem.className = 'file-item';
    fileItem.href = file.url;
    fileItem.target = '_blank';
    fileItem.innerHTML = `
      <div class="file-icon">
        <i data-lucide="${icon}"></i>
      </div>
      <div class="file-info">
        <span class="file-name" title="${file.name}">${file.name}</span>
        <span class="file-size">${formatBytes(file.sizeBytes)}</span>
      </div>
    `;
    filesList.appendChild(fileItem);
  });

  lucide.createIcons();
}

// Format bytes to human readable sizes
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Upload Avatar picture API trigger
async function uploadAvatarFile(file) {
  const formData = new FormData();
  formData.append('avatar', file);

  showToast('Đang tải ảnh đại diện lên...', 'info');

  try {
    const response = await fetch('/api/upload-avatar', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Upload failed.');
    }

    const data = await response.json();
    portfolioData.profile.avatar = data.avatarUrl;
    
    // Refresh profile UI
    renderProfile();
    showToast('Cập nhật ảnh đại diện thành công!', 'success');
    showSaveButton();

  } catch (error) {
    console.error(error);
    showToast('Tải ảnh đại diện thất bại.', 'error');
  }
}

// Save all configurations to Node backend disk (portfolio-data.json)
async function saveAllChangesToDisk() {
  try {
    const response = await fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(portfolioData)
    });

    if (!response.ok) {
      throw new Error('Lỗi đồng bộ dữ liệu.');
    }

    hideSaveButton();
    showToast('Đã lưu tất cả thay đổi vào tệp cấu hình thiết bị!', 'success');

  } catch (error) {
    console.error(error);
    showToast('Không thể lưu dữ liệu vào thiết bị: ' + error.message, 'error');
  }
}

// Toast notification display engine
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'check-circle';
  if (type === 'error') icon = 'alert-triangle';
  if (type === 'info') icon = 'info';

  toast.innerHTML = `
    <div class="toast-icon-wrapper">
      <i data-lucide="${icon}"></i>
    </div>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  // Smooth fade-in
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Auto clean-up
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// Render career roadmap section
function renderRoadmap() {
  if (!portfolioData) return;

  if (!portfolioData.roadmap) {
    portfolioData.roadmap = {
      shortTerm: 'Chưa có thông tin lộ trình ngắn hạn.',
      longTerm: 'Chưa có thông tin lộ trình dài hạn.'
    };
  }

  const shortTermVal = portfolioData.roadmap.shortTerm || '';
  const longTermVal = portfolioData.roadmap.longTerm || '';

  const shortViewer = document.getElementById('roadmapShortTermViewer');
  const shortEditor = document.getElementById('roadmapShortTermEditor');
  const shortInput = document.getElementById('roadmapShortTermInput');

  const longViewer = document.getElementById('roadmapLongTermViewer');
  const longEditor = document.getElementById('roadmapLongTermEditor');
  const longInput = document.getElementById('roadmapLongTermInput');

  if (isEditMode) {
    shortViewer.classList.add('hide');
    shortEditor.classList.remove('hide');
    shortInput.value = shortTermVal;

    longViewer.classList.add('hide');
    longEditor.classList.remove('hide');
    longInput.value = longTermVal;
  } else {
    shortViewer.classList.remove('hide');
    shortEditor.classList.add('hide');
    shortViewer.innerHTML = formatParagraphs(shortTermVal);

    longViewer.classList.remove('hide');
    longEditor.classList.add('hide');
    longViewer.innerHTML = formatParagraphs(longTermVal);
  }
}

// Click handler to create new project card
function handleAddProjectClick() {
  const folderName = prompt('Nhập tên thư mục dự án cục bộ (ví dụ: MY-NEW-PROJECT):');
  if (folderName === null) return; // user cancelled

  const key = folderName.trim();
  if (!key) {
    showToast('Tên thư mục không được để trống!', 'error');
    return;
  }

  if (portfolioData.projects[key]) {
    showToast(`Dự án "${key}" đã tồn tại!`, 'error');
    return;
  }

  // Set initial project fields
  portfolioData.projects[key] = {
    title: key,
    subtitle: 'Dự án mới tạo',
    description: 'Mô tả chi tiết các công việc đã thực hiện trong dự án...',
    skills: ['HTML', 'CSS', 'JavaScript'],
    customLinks: []
  };

  renderProjectsGrid();
  showSaveButton();
  openProjectDetails(key);
  showToast(`Đã tạo dự án mới: "${key}". Hãy thiết lập chi tiết!`, 'success');
}
