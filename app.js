/**
 * Main Application Logic - Project Portfolio Builder & Digital Garden
 */

// Application State
let portfolioData = null;
let isEditMode = false;
let currentProjectKey = null;
let activeModalSkills = [];
let activeModalLinks = [];
let currentCategoryFilter = 'all';

// Predefined Skills fallback map in case not present in data
const defaultSkills = {
  "Excel & Mô hình tài chính (P&L, COGS)": 90,
  "Figma (UI/UX Design, Prototyping)": 90,
  "Python & PyTorch (Deep Learning, AI)": 85,
  "Unity3D & C# (Game Dev & AR Cards)": 80,
  "Node.js / React (Fullstack Web)": 80
};

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

// Hide Floating Save Changes button in Header
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

    // Load initial portfolio configuration
    const response = await fetch('./portfolio-data.json');
    if (!response.ok) {
      throw new Error('Failed to load portfolio database.');
    }
    portfolioData = await response.json();

    // Initialize profile.skills if missing
    if (portfolioData.profile && !portfolioData.profile.skills) {
      portfolioData.profile.skills = { ...defaultSkills };
    }

    // Render components
    renderProfile();
    renderStats();
    renderSkillsChart();
    renderFeaturedGrid();
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

// Render Profile details in Bento Hero & Profile
function renderProfile() {
  if (!portfolioData) return;

  const profile = portfolioData.profile;

  // Name, Title, Bio
  const nameEl = document.getElementById('profileName');
  const titleEl = document.getElementById('profileTitle');
  const bioEl = document.getElementById('profileBio');

  if (nameEl) nameEl.innerHTML = profile.name || nameEl.getAttribute('data-placeholder');
  if (titleEl) titleEl.innerHTML = profile.title || titleEl.getAttribute('data-placeholder');
  if (bioEl) bioEl.innerHTML = profile.bio || bioEl.getAttribute('data-placeholder');

  // Configure inline editable fields in state
  configureInlineEditing(nameEl, 'profile.name', false);
  configureInlineEditing(titleEl, 'profile.title', false);
  configureInlineEditing(bioEl, 'profile.bio', true);

  // Philosophy Quote
  const philosophyEl = document.getElementById('philosophyQuote');
  if (philosophyEl) {
    philosophyEl.innerHTML = profile.philosophy || philosophyEl.getAttribute('data-placeholder');
    configureInlineEditing(philosophyEl, 'profile.philosophy', true);
  }

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

// Render contact badges or forms inside Bento profile box
function renderContactLinks() {
  const container = document.getElementById('contactLinksContainer');
  if (!container) return;
  container.innerHTML = '';

  const links = portfolioData.profile.links || {};

  // In Edit Mode, we render the edit fields inside the bento block
  if (isEditMode) {
    const editForm = document.createElement('div');
    editForm.className = 'links-editor-form';
    editForm.style.gridTemplateColumns = '1fr'; // single column for bento profile
    editForm.style.padding = '10px';
    editForm.style.marginTop = '0';
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
    // Viewer mode contact items
    const items = [
      { key: 'email', icon: 'mail', prefix: 'mailto:', label: links.email },
      { key: 'phone', icon: 'phone', prefix: 'tel:', label: links.phone },
      { key: 'github', icon: 'github', prefix: '', label: links.github },
      { key: 'linkedin', icon: 'linkedin', prefix: '', label: links.linkedin }
    ];

    items.forEach(item => {
      if (item.label) {
        const linkEl = document.createElement('a');
        linkEl.className = 'contact-item';
        linkEl.href = item.prefix + item.label;
        linkEl.target = item.key === 'github' || item.key === 'linkedin' ? '_blank' : '_self';
        
        // Shorten label for Github and Linkedin to "Đức Nguyễn" as requested
        let displayLabel = item.label;
        if (item.key === 'github' || item.key === 'linkedin') {
          displayLabel = "Đức Nguyễn";
        }

        linkEl.innerHTML = `<i data-lucide="${item.icon}"></i> <span>${displayLabel}</span>`;
        container.appendChild(linkEl);
      }
    });

    lucide.createIcons();
  }
}

// Render Bento Quick Stats Section
function renderStats() {
  const container = document.getElementById('statsGrid');
  if (!container) return;
  container.innerHTML = '';

  if (!portfolioData.profile.stats) {
    portfolioData.profile.stats = [
      { number: "7+", label: "Dự án Đa lĩnh vực" },
      { number: "4", label: "Trụ cột Chuyên môn" },
      { number: "100%", label: "Đam mê thực tế" }
    ];
  }

  const stats = portfolioData.profile.stats;

  if (isEditMode) {
    stats.forEach((stat, index) => {
      const item = document.createElement('div');
      item.className = 'stat-item-edit';
      item.style.display = 'flex';
      item.style.flexDirection = 'column';
      item.style.gap = '6px';
      item.innerHTML = `
        <input type="text" class="stat-number-input" value="${stat.number}" style="font-size:1.5rem; font-weight:800; color:var(--color-primary); width:100%; border:1px dashed var(--color-primary); border-radius:var(--radius-sm); padding:2px 6px; background:var(--bg-secondary); outline:none;">
        <input type="text" class="stat-label-input" value="${stat.label}" style="font-size:0.75rem; font-weight:700; color:var(--text-muted); width:100%; border:1px dashed var(--color-primary); border-radius:var(--radius-sm); padding:2px 6px; background:var(--bg-secondary); outline:none; text-transform:uppercase;">
      `;

      const numInput = item.querySelector('.stat-number-input');
      const lblInput = item.querySelector('.stat-label-input');

      const updateStat = () => {
        portfolioData.profile.stats[index].number = numInput.value.trim();
        portfolioData.profile.stats[index].label = lblInput.value.trim();
        showSaveButton();
      };

      numInput.addEventListener('change', updateStat);
      lblInput.addEventListener('change', updateStat);

      container.appendChild(item);
    });
  } else {
    stats.forEach(stat => {
      const item = document.createElement('div');
      item.className = 'stat-item';
      item.innerHTML = `
        <span class="stat-number">${stat.number}</span>
        <span class="stat-label">${stat.label}</span>
      `;
      container.appendChild(item);
    });
  }
}

// Render Bento Skills Progress Bar Chart
function renderSkillsChart() {
  const chartContainer = document.getElementById('skillsChart');
  if (!chartContainer) return;
  chartContainer.innerHTML = '';

  const skillsMap = (portfolioData.profile && portfolioData.profile.skills) || defaultSkills;
  
  if (isEditMode) {
    // Render skills editor forms
    const formContainer = document.createElement('div');
    formContainer.className = 'skills-editor-grid';
    formContainer.style.gridColumn = '1 / -1';
    formContainer.style.display = 'flex';
    formContainer.style.flexDirection = 'column';
    formContainer.style.gap = '12px';
    formContainer.style.width = '100%';

    Object.keys(skillsMap).forEach(skill => {
      const score = skillsMap[skill];
      const row = document.createElement('div');
      row.className = 'skill-edit-row';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '10px';
      row.style.width = '100%';
      row.innerHTML = `
        <input type="text" class="skill-name-input editor-text-input" value="${skill}" placeholder="Tên kỹ năng" style="flex-grow: 1; padding: 6px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.85rem; background: var(--bg-secondary); outline: none;">
        <input type="number" class="skill-score-input editor-text-input" value="${score}" min="0" max="100" style="width: 70px; padding: 6px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.85rem; background: var(--bg-secondary); outline: none;">
        <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted);">%</span>
        <button type="button" class="btn-remove-skill" style="background:none; border:1px solid var(--border-color); padding:6px; border-radius:var(--radius-sm); cursor:pointer; color:var(--text-muted); display:flex; align-items:center;">
          <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
        </button>
      `;

      // Event listeners to sync inputs back to state
      const nameInput = row.querySelector('.skill-name-input');
      const scoreInput = row.querySelector('.skill-score-input');
      const removeBtn = row.querySelector('.btn-remove-skill');

      const updateSkill = () => {
        const oldName = skill;
        const newName = nameInput.value.trim();
        const newScore = parseInt(scoreInput.value) || 0;

        if (newName && newName !== oldName) {
          // Rename key in object
          delete portfolioData.profile.skills[oldName];
          portfolioData.profile.skills[newName] = newScore;
          renderSkillsChart();
        } else if (newName) {
          portfolioData.profile.skills[oldName] = newScore;
        }
        showSaveButton();
      };

      nameInput.addEventListener('change', updateSkill);
      scoreInput.addEventListener('change', updateSkill);
      removeBtn.addEventListener('click', () => {
        delete portfolioData.profile.skills[skill];
        renderSkillsChart();
        showSaveButton();
      });

      formContainer.appendChild(row);
    });

    // Add Skill Row at the end
    const addRow = document.createElement('div');
    addRow.className = 'skill-add-row';
    addRow.style.gridColumn = '1 / -1';
    addRow.style.display = 'flex';
    addRow.style.gap = '10px';
    addRow.style.marginTop = '6px';
    addRow.style.width = '100%';
    addRow.innerHTML = `
      <input type="text" id="newSkillName" placeholder="Kỹ năng mới (ví dụ: PowerBI)" style="flex-grow: 1; padding: 6px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.85rem; background: var(--bg-secondary); outline: none;">
      <input type="number" id="newSkillScore" value="80" min="0" max="100" style="width: 70px; padding: 6px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.85rem; background: var(--bg-secondary); outline: none;">
      <button type="button" id="btnAddSkill" class="btn btn-secondary-sm" style="display:flex; align-items:center; gap:4px; padding:6px 12px; font-size:0.8rem; height: 34px;">
        <i data-lucide="plus" style="width:14px; height:14px;"></i> Thêm
      </button>
    `;

    addRow.querySelector('#btnAddSkill').addEventListener('click', () => {
      const nameInput = addRow.querySelector('#newSkillName');
      const scoreInput = addRow.querySelector('#newSkillScore');
      const name = nameInput.value.trim();
      const score = parseInt(scoreInput.value) || 80;

      if (name) {
        portfolioData.profile.skills[name] = score;
        renderSkillsChart();
        showSaveButton();
      }
    });

    chartContainer.appendChild(formContainer);
    chartContainer.appendChild(addRow);
    lucide.createIcons();
  } else {
    // Viewer mode (render progress bars)
    Object.keys(skillsMap).forEach(skill => {
      const score = skillsMap[skill];
      const item = document.createElement('div');
      item.className = 'skill-bar-item';
      item.innerHTML = `
        <div class="skill-info">
          <span>${skill}</span>
          <span class="skill-val">${score}%</span>
        </div>
        <div class="skill-progress-track">
          <div class="skill-progress-bar" style="width: ${score}%;"></div>
        </div>
      `;
      chartContainer.appendChild(item);
    });
  }
}

// Helper to determine category stylesheet class and lucide icon
function getCategoryMeta(category) {
  let categoryClass = 'software';
  let iconName = 'folder-git-2';
  
  if (category === 'Product & Business') {
    categoryClass = 'business';
    iconName = 'briefcase';
  } else if (category === 'Data Analytics') {
    categoryClass = 'analytics';
    iconName = 'bar-chart-2';
  } else if (category === 'Software & Game Dev') {
    categoryClass = 'software';
    iconName = 'code-2';
  } else if (category === 'UI/UX Design') {
    categoryClass = 'design';
    iconName = 'palette';
  }

  return { categoryClass, iconName };
}

// Helper to scan files list and extract first image preview URL
function findProjectImagePreview(project) {
  if (project.files && project.files.length > 0) {
    const imgFile = project.files.find(f => {
      const n = f.name.toLowerCase();
      return n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.gif');
    });
    if (imgFile) {
      return imgFile.url;
    }
  }
  return null;
}

// Render Featured Projects Grid
function renderFeaturedGrid() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const projects = portfolioData.projects || {};
  const projectKeys = Object.keys(projects);

  // Filter projects marked featured = true. Fall back to top 3 if none marked featured.
  let featuredKeys = projectKeys.filter(key => projects[key].featured === true);
  if (featuredKeys.length === 0) {
    // default fallbacks
    featuredKeys = projectKeys.slice(0, 3);
  }

  featuredKeys.forEach(key => {
    const project = projects[key];
    const card = document.createElement('div');
    card.className = 'project-card featured-card';
    card.setAttribute('data-project-key', key);

    const { iconName } = getCategoryMeta(project.category);
    
    const skillsHtml = (project.skills || [])
      .slice(0, 3)
      .map(skill => `<span class="skill-badge">${skill}</span>`)
      .join('');
    
    const remainingCount = (project.skills || []).length - 3;
    const remainingBadge = remainingCount > 0 ? `<span class="skill-badge">+${remainingCount}</span>` : '';
    const linksCount = (project.customLinks || []).length;

    card.innerHTML = `
      <!-- Hover Edit Icon -->
      <div class="edit-indicator">
        <i data-lucide="edit-3"></i>
      </div>
      
      <div class="project-card-header">
        <h3 class="project-card-title">${project.title || key}</h3>
        <div class="project-card-icon">
          <i data-lucide="${iconName}"></i>
        </div>
      </div>
      
      <div class="project-card-subtitle">${project.subtitle || 'Dự án Tiêu biểu'}</div>
      
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
          Xem Case Study
          <i data-lucide="arrow-right"></i>
        </span>
      </div>
    `;

    card.addEventListener('click', () => {
      openProjectDetails(key);
    });

    grid.appendChild(card);
  });

  if (featuredKeys.length === 0) {
    grid.innerHTML = '<div class="no-files-placeholder" style="grid-column: 1/-1;">Chưa có dự án nào được gắn cờ nổi bật.</div>';
  }

  lucide.createIcons();
}

// Render dynamic project cards grid (Filtering System)
function renderProjectsGrid() {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const projects = portfolioData.projects || {};
  let projectKeys = Object.keys(projects);

  // Apply active category filter tab
  if (currentCategoryFilter !== 'all') {
    projectKeys = projectKeys.filter(key => projects[key].category === currentCategoryFilter);
  }

  projectKeys.forEach(key => {
    const project = projects[key];
    const card = document.createElement('div');
    card.className = 'project-card';
    card.setAttribute('data-project-key', key);

    const { iconName } = getCategoryMeta(project.category);
    
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
          <i data-lucide="${iconName}"></i>
        </div>
      </div>
      
      <div class="project-card-subtitle">${project.subtitle || 'Dự án'}</div>
      
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
          Xem Case Study
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
      <span class="project-card-add-sub">Đồng bộ tự động các file trong thư mục dự án cục bộ</span>
    `;
    addCard.addEventListener('click', () => {
      handleAddProjectClick();
    });
    grid.appendChild(addCard);
  }

  if (projectKeys.length === 0 && !isEditMode) {
    grid.innerHTML = '<div class="no-files-placeholder" style="grid-column: 1/-1;">Không tìm thấy dự án nào thuộc chuyên môn này.</div>';
  }

  lucide.createIcons();
}

// In-place inline editing configurations
function configureInlineEditing(element, fieldPath, isTextArea = false) {
  if (!element) return;
  
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
  if (modeToggle) {
    modeToggle.addEventListener('click', () => {
      toggleMode();
    });
  }

  // Global Save Btn in Header
  const saveAllBtn = document.getElementById('saveAllBtn');
  if (saveAllBtn) {
    saveAllBtn.addEventListener('click', () => {
      saveAllChangesToDisk();
    });
  }

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

  if (avatarUploadArea) {
    avatarUploadArea.addEventListener('click', () => {
      if (isEditMode && avatarInput) {
        avatarInput.click();
      }
    });
  }

  if (avatarInput) {
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        uploadAvatarFile(file);
      }
    });
  }

  // Roadmap Inputs change events
  const shortInput = document.getElementById('roadmapShortTermInput');
  const longInput = document.getElementById('roadmapLongTermInput');
  
  if (shortInput) {
    shortInput.addEventListener('input', (e) => {
      portfolioData.roadmap.shortTerm = e.target.value;
      showSaveButton();
    });
  }
  if (longInput) {
    longInput.addEventListener('input', (e) => {
      portfolioData.roadmap.longTerm = e.target.value;
      showSaveButton();
    });
  }

  // Portfolio tab triggers
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      handleFilterTabClick(tab);
    });
  });
}

// Handle Filter Tab Click with transition animation
function handleFilterTabClick(selectedTab) {
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(t => t.classList.remove('active'));
  selectedTab.classList.add('active');

  currentCategoryFilter = selectedTab.getAttribute('data-filter');
  
  const grid = document.getElementById('projectsGrid');
  if (grid) {
    grid.style.opacity = '0';
    grid.style.transform = 'translateY(8px)';
    
    setTimeout(() => {
      renderProjectsGrid();
      grid.style.opacity = '1';
      grid.style.transform = 'translateY(0)';
    }, 150);
  }
}

// Toggle Mode: Viewer vs Editor
function toggleMode() {
  isEditMode = !isEditMode;

  const modeToggle = document.getElementById('modeToggle');
  const viewerLabel = document.querySelector('.viewer-label');
  const editorLabel = document.querySelector('.editor-label');
  const contentBody = document.body;

  if (isEditMode) {
    if (modeToggle) modeToggle.classList.add('active');
    if (editorLabel) editorLabel.classList.add('active');
    if (viewerLabel) viewerLabel.classList.remove('active');
    contentBody.classList.add('edit-mode-active');
    showToast('Đã chuyển sang Chế độ Chỉnh sửa', 'info');
  } else {
    if (modeToggle) modeToggle.classList.remove('active');
    if (editorLabel) editorLabel.classList.remove('active');
    if (viewerLabel) viewerLabel.classList.add('active');
    contentBody.classList.remove('edit-mode-active');
    showToast('Đã quay lại Chế độ Người xem', 'info');
  }

  // Refresh profile fields, grids & links
  renderProfile();
  renderStats();
  renderSkillsChart();
  renderFeaturedGrid();
  renderProjectsGrid();
  renderRoadmap();
}

// Open Upgraded Detailed Case Study Modal
async function openProjectDetails(projectKey) {
  currentProjectKey = projectKey;
  const project = portfolioData.projects[projectKey];

  if (!project) return;

  // Set titles
  document.getElementById('modalProjectTitle').innerText = project.title || projectKey;
  document.getElementById('modalProjectSubtitle').innerText = project.subtitle || 'Dự án thực tế';

  // Bind title editor inputs
  const titleInput = document.getElementById('projectTitleInput');
  const subtitleInput = document.getElementById('projectSubtitleInput');
  if (titleInput) titleInput.value = project.title || projectKey;
  if (subtitleInput) subtitleInput.value = project.subtitle || '';

  // Copy skills & links to working lists
  activeModalSkills = [...(project.skills || [])];
  activeModalLinks = (project.customLinks || []).map(link => ({ ...link }));

  // Set up descriptions, problem, solution, impact
  const problemViewer = document.getElementById('modalProblemViewer');
  const problemInput = document.getElementById('projectProblemInput');
  const solutionViewer = document.getElementById('modalSolutionViewer');
  const solutionInput = document.getElementById('projectSolutionInput');
  const impactViewer = document.getElementById('modalImpactViewer');
  const impactInput = document.getElementById('projectImpactInput');
  
  // Legacy description block
  const descViewer = document.getElementById('modalDescViewer');
  const descInput = document.getElementById('projectDescInput');

  // Bind values
  if (problemViewer) problemViewer.innerHTML = formatParagraphs(project.problem || 'Chưa cập nhật nội dung bài toán.');
  if (problemInput) problemInput.value = project.problem || '';
  if (solutionViewer) solutionViewer.innerHTML = formatParagraphs(project.solution || 'Chưa cập nhật giải pháp thực hiện.');
  if (solutionInput) solutionInput.value = project.solution || '';
  if (impactViewer) impactViewer.innerHTML = formatParagraphs(project.impact || 'Chưa cập nhật kết quả tác động.');
  if (impactInput) impactInput.value = project.impact || '';
  if (descViewer) descViewer.innerHTML = formatParagraphs(project.description || '');
  if (descInput) descInput.value = project.description || '';

  // Setup Overview Meta
  const roleVal = document.getElementById('modalProjectRole');
  const catVal = document.getElementById('modalProjectCategory');
  if (roleVal) roleVal.innerText = project.role || 'Thành viên thực hiện';
  if (catVal) catVal.innerText = project.category || 'Phát triển ứng dụng';

  // Set category dropdown & cờ featured in Editor
  const categoryInput = document.getElementById('projectCategoryInput');
  const featuredInput = document.getElementById('projectFeaturedInput');
  if (categoryInput) categoryInput.value = project.category || 'Software & Game Dev';
  if (featuredInput) featuredInput.checked = project.featured === true;

  // Render Modal Sub-Sections
  renderModalSkills();
  renderModalLinks();

  // Fetch local project directory files
  renderProjectFilesList(projectKey);

  // Set category icon in Modal
  const { iconName } = getCategoryMeta(project.category);
  const iconBox = document.getElementById('modalProjectIconBox');
  if (iconBox) {
    iconBox.innerHTML = `<i data-lucide="${iconName}" class="proj-icon"></i>`;
  }

  // Toggle editor views inside modal based on Edit Mode
  const modalFooter = document.getElementById('modalFooter');
  const modalMetaEditor = document.getElementById('modalMetaEditor');
  
  const blockOverview = document.getElementById('blockOverview');
  const legacyDescSection = document.getElementById('modalLegacyDescSection');

  const editors = [
    'modalProblemEditor', 'modalSolutionEditor', 'modalImpactEditor', 
    'modalSkillsEditor', 'externalLinksEditor', 'modalHeaderEditor', 'modalDescEditor'
  ];
  const viewers = [
    'modalProblemViewer', 'modalSolutionViewer', 'modalImpactViewer', 
    'modalSkillsViewer', 'externalLinksViewer', 'modalHeaderViewer', 'modalDescViewer'
  ];

  if (isEditMode) {
    if (modalFooter) modalFooter.classList.remove('hide');
    if (modalMetaEditor) modalMetaEditor.classList.remove('hide');
    if (blockOverview) blockOverview.classList.add('hide');
    if (legacyDescSection) legacyDescSection.classList.remove('hide');
    
    editors.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hide');
    });
    viewers.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hide');
    });
  } else {
    if (modalFooter) modalFooter.classList.add('hide');
    if (modalMetaEditor) modalMetaEditor.classList.add('hide');
    if (blockOverview) blockOverview.classList.remove('remove');
    
    // Hide legacy description if empty in viewer mode
    if (legacyDescSection) {
      if (!project.description) {
        legacyDescSection.classList.add('hide');
      } else {
        legacyDescSection.classList.remove('hide');
      }
    }

    editors.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hide');
    });
    viewers.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hide');
    });

    // Hide links section entirely if empty in viewer mode
    const linksSection = document.getElementById('externalLinksSection');
    if (linksSection) {
      if (activeModalLinks.length === 0) {
        linksSection.classList.add('hide');
      } else {
        linksSection.classList.remove('hide');
      }
    }
  }

  // Open modal
  const modal = document.getElementById('projectModal');
  if (modal) modal.classList.remove('hide');
  document.body.style.overflow = 'hidden'; // prevent page scroll behind modal

  lucide.createIcons();
}

// Close Modal
function closeModal() {
  const modal = document.getElementById('projectModal');
  if (modal) modal.classList.add('hide');
  document.body.style.overflow = '';
}

// Save Project configurations (locally in state memory)
function saveProjectChanges() {
  if (!currentProjectKey) return;

  const project = portfolioData.projects[currentProjectKey];
  if (!project) return;

  // Save basic fields
  const titleInputVal = document.getElementById('projectTitleInput').value.trim();
  const subtitleInputVal = document.getElementById('projectSubtitleInput').value.trim();
  project.title = titleInputVal || currentProjectKey;
  project.subtitle = subtitleInputVal || 'Dự án';

  // Save category and featured checkbox status
  const catInput = document.getElementById('projectCategoryInput');
  const featInput = document.getElementById('projectFeaturedInput');
  if (catInput) project.category = catInput.value;
  if (featInput) project.featured = featInput.checked;

  // Save detailed problem, solution, impact
  const problemVal = document.getElementById('projectProblemInput').value.trim();
  const solutionVal = document.getElementById('projectSolutionInput').value.trim();
  const impactVal = document.getElementById('projectImpactInput').value.trim();
  const descVal = document.getElementById('projectDescInput').value.trim();

  project.problem = problemVal;
  project.solution = solutionVal;
  project.impact = impactVal;
  project.description = descVal;

  // Save skills tags list
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

  // Refresh Grids & Close Modal
  renderFeaturedGrid();
  renderProjectsGrid();
  closeModal();

  showToast(`Đã ghi nhận thay đổi cho "${project.title}". Hãy lưu lại tệp cấu hình!`, 'success');
  showSaveButton();
}

// Render skills tag arrays in modal
function renderModalSkills() {
  const viewerContainer = document.getElementById('modalSkillsViewer');
  const editorContainer = document.getElementById('modalSkillsEditorTags');

  if (viewerContainer) viewerContainer.innerHTML = '';
  if (editorContainer) editorContainer.innerHTML = '';

  activeModalSkills.forEach((skill, index) => {
    // Viewer Badges
    if (viewerContainer) {
      const badgeViewer = document.createElement('span');
      badgeViewer.className = 'skill-tag-large';
      badgeViewer.innerText = skill;
      viewerContainer.appendChild(badgeViewer);
    }

    // Editor Badges (with delete controls)
    if (editorContainer) {
      const badgeEditor = document.createElement('span');
      badgeEditor.className = 'skill-tag-large';
      badgeEditor.innerHTML = `
        <span>${skill}</span>
        <button class="remove-tag-btn" data-index="${index}" title="Xóa tag">
          <i data-lucide="x"></i>
        </button>
      `;
      editorContainer.appendChild(badgeEditor);
    }
  });

  // Attach delete events in editor
  if (editorContainer) {
    editorContainer.querySelectorAll('.remove-tag-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-index'));
        activeModalSkills.splice(idx, 1);
        renderModalSkills();
      });
    });
  }

  lucide.createIcons();
}

// Add custom tag inside project editor modal
function handleAddSkillInModal() {
  const input = document.getElementById('newSkillInput');
  if (!input) return;
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

  if (viewerContainer) viewerContainer.innerHTML = '';
  if (inputsList) inputsList.innerHTML = '';

  // Render Viewer badges
  activeModalLinks.forEach((link) => {
    if (viewerContainer) {
      const linkBadge = document.createElement('a');
      linkBadge.className = 'external-link-badge';
      linkBadge.href = link.url;
      linkBadge.target = '_blank';
      linkBadge.innerHTML = `
        <i data-lucide="link-2"></i>
        <span>${link.name}</span>
      `;
      viewerContainer.appendChild(linkBadge);
    }
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
  if (!list) return;
  
  const row = document.createElement('div');
  row.className = 'link-row';
  row.innerHTML = `
    <input type="text" class="link-name-input" placeholder="Tên Link" value="${name}">
    <input type="url" class="link-url-input" placeholder="Đường dẫn URL" value="${url}">
    <button class="remove-link-btn" title="Xóa link">
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
  if (!filesList) return;
  
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
    
    // Cache the files dynamically in the local memory state
    if (project) {
      project.files = files;
    }
    
    displayFilesList(files);
  } catch (error) {
    console.error(error);
    filesList.innerHTML = '<div class="no-files-placeholder">Không tìm thấy tệp tin báo cáo nào trong thư mục dự án này.</div>';
  }
}

// Render files list template
function displayFilesList(files) {
  const filesList = document.getElementById('projectFilesList');
  if (!filesList) return;
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
    showToast('Đã lưu tất cả thay đổi vào thiết bị cục bộ thành công!', 'success');
    
    // Refresh visual grids to incorporate any category changes or featured updates
    renderFeaturedGrid();
    renderProjectsGrid();

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
    if (shortViewer) shortViewer.classList.add('hide');
    if (shortEditor) shortEditor.classList.remove('hide');
    if (shortInput) shortInput.value = shortTermVal;

    if (longViewer) longViewer.classList.add('hide');
    if (longEditor) longEditor.classList.remove('hide');
    if (longInput) longInput.value = longTermVal;
  } else {
    if (shortViewer) {
      shortViewer.classList.remove('hide');
      shortViewer.innerHTML = formatParagraphs(shortTermVal);
    }
    if (shortEditor) shortEditor.classList.add('hide');

    if (longViewer) {
      longViewer.classList.remove('hide');
      longViewer.innerHTML = formatParagraphs(longTermVal);
    }
    if (longEditor) longEditor.classList.add('hide');
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
    category: 'Software & Game Dev',
    featured: false,
    description: 'Mô tả tổng quát các công việc đã thực hiện trong dự án...',
    problem: 'Bài toán thực tế cần giải quyết...',
    solution: 'Giải pháp thực hiện và tiếp cận đa chiều...',
    impact: 'Kết quả đạt được, số liệu...',
    skills: ['HTML', 'CSS', 'JavaScript'],
    customLinks: []
  };

  renderProjectsGrid();
  showSaveButton();
  openProjectDetails(key);
  showToast(`Đã tạo dự án mới: "${key}". Hãy thiết lập chi tiết!`, 'success');
}
