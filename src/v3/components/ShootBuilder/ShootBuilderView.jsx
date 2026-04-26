import React, { useState, useMemo, useCallback } from 'react';
import {
  FolderPlus, FolderOpen, ChevronDown, ChevronRight, Check, RotateCcw,
  Folder, FileText, Settings2, AlertTriangle, CheckCircle2, Copy,
  BookOpen, ClipboardList, Circle,
} from 'lucide-react';
import { useAppState } from '../../contexts/StateContext';
import { toast } from '../Toast';
import { DEFAULT_SHOOT_FOLDER_TREE } from '../../utils/initialState';

// ── Constants ────────────────────────────────────────────────────────────────

const DISABLE_OPTIONAL_TREE = (tree) => tree.map(node => ({
  ...node,
  enabled: ['catalog', 'raw', 'readme', 'checklist'].includes(node.id),
  children: (node.children || []).map(c => ({ ...c, enabled: false })),
}));

const ENABLE_ALL_TREE = (tree) => tree.map(node => ({
  ...node,
  enabled: true,
  children: (node.children || []).map(c => ({ ...c, enabled: true })),
}));

const README_CONTENT = `THE LOVE LENS LIGHTROOM CLASSIC WORKFLOW
=========================================

Use this guide every time you import, edit, export, and back up a photo shoot.

MAIN FOLDERS
------------
01_Catalog   → Save the Lightroom Classic catalog here.
02_RAW       → Import selected RAW files from the SD card here.
03_Finals    → Export finished edited photos here.
04_Delivery  → Put client-ready files here.
05_Backup    → For backup notes or extra backup files.

IMPORTANT SAFETY RULE
---------------------
Do NOT format or erase the SD card until the shoot is fully backed up and delivered.

Recommended safety order:
  1. Back up the full SD card first.
  2. Import selected photos into Lightroom.
  3. Edit the photos.
  4. Export the finals.
  5. Back up the full shoot folder.
  6. Deliver the gallery.
  7. Only then format the SD card.

STEP 1 — BACK UP THE FULL SD CARD FIRST
----------------------------------------
Before opening Lightroom, copy the full SD card to a backup location.
  1. Insert SD card.
  2. Open Finder → find the card in the sidebar.
  3. Copy the full DCIM folder (or full card) to an external drive.
  Recommended backup name: ShootName_FULL_CARD_BACKUP

Do not delete anything from the SD card yet.

STEP 2 — OPEN LIGHTROOM CLASSIC
--------------------------------
Open Lightroom Classic (not the cloud version).

STEP 3 — CREATE A NEW CATALOG FOR THIS SHOOT
---------------------------------------------
  1. File → New Catalog
  2. Choose this shoot folder → open 01_Catalog
  3. Name the catalog after the shoot (e.g. Ariana_Engagement_Catalog)
  4. Click Create.

STEP 4 — OPEN THE IMPORT WINDOW
---------------------------------
  Library section → click Import (bottom-left)
  or: File → Import Photos And Video

STEP 5 — SELECT THE SD CARD AS SOURCE
---------------------------------------
  Left panel → Source → click the SD card.
  Wait for image previews to load.

STEP 6 — CHOOSE "COPY" AT THE TOP
-----------------------------------
  Select COPY (not Add, not Move).

STEP 7 — UNCHECK ALL, THEN SELECT KEEPERS
-------------------------------------------
  1. Click Uncheck All.
  2. Check only sharp, in-focus, keeper photos.
  3. Leave test shots, blurry, and closed-eye photos unchecked.

STEP 8 — SET DESTINATION TO 02_RAW
-------------------------------------
  Right panel → Destination → choose 02_RAW inside this shoot folder.

STEP 9 — CLICK IMPORT
-----------------------
  Verify: Source = SD card | Copy selected | Destination = 02_RAW
  Then click Import.

STEP 10 — SECOND CULL INSIDE LIGHTROOM
----------------------------------------
  Review again. Delete or reject anything that is not actually good.

STEP 11 — EDIT THE PHOTOS
---------------------------
  Develop section. Recommended order:
  preset → white balance → exposure → contrast → highlights/shadows
  → crop/straighten → skin tones → remove distractions → sync edits

STEP 12 — EXPORT FULL-RESOLUTION
----------------------------------
  File → Export → Hard Drive
  Folder: 03_Finals/Full Resolution
  Settings: JPEG, sRGB, Quality 90-100, Resize Off, Sharpening Standard

STEP 13 — EXPORT WEB SIZE
---------------------------
  File → Export → Hard Drive
  Folder: 03_Finals/Web Size
  Settings: JPEG, sRGB, Quality 80-90, Long Edge 2048-2500px

STEP 14 — PREPARE DELIVERY
----------------------------
  Copy correct exports into:
    04_Delivery/Sneak Peeks   → early preview photos
    04_Delivery/Final Gallery → full client gallery
    04_Delivery/Social Media  → Instagram / website crops

STEP 15 — BACK UP THE FULL SHOOT FOLDER
-----------------------------------------
  Back up to external drive and/or cloud before formatting the SD card.

STEP 16 — BACK UP THE LIGHTROOM CATALOG
-----------------------------------------
  Lightroom Classic → Catalog Settings → Backups
  Recommended: Once A Week When Exiting Lightroom

STEP 17 — FORMAT THE SD CARD ONLY WHEN ALL SAFE
-------------------------------------------------
  [ ] Full SD card backup exists
  [ ] RAW files imported into 02_RAW
  [ ] Photos edited
  [ ] Full-res finals exported
  [ ] Web-size finals exported
  [ ] Client delivery folder ready
  [ ] Full shoot folder backed up
  [ ] Gallery delivered or safely stored
`;

const CHECKLIST_CONTENT = `SHOOT CHECKLIST
===============

SETUP
[ ] Shoot folder created
[ ] Folder name is correct
[ ] 01_Catalog folder exists
[ ] 02_RAW folder exists
[ ] 03_Finals folder exists
[ ] 04_Delivery folder exists (if needed)

SD CARD BACKUP
[ ] SD card inserted
[ ] Full SD card copied to backup location
[ ] Backup folder name includes shoot name
[ ] SD card has NOT been formatted

LIGHTROOM CATALOG
[ ] Lightroom Classic opened
[ ] File > New Catalog clicked
[ ] Catalog saved inside 01_Catalog
[ ] Catalog name matches the shoot

IMPORT
[ ] Import window opened
[ ] SD card selected on the left side
[ ] COPY selected at the top
[ ] Uncheck All clicked
[ ] Keeper photos checked
[ ] Destination set to 02_RAW
[ ] Don't Import Suspected Duplicates = ON
[ ] Import clicked

EDITING
[ ] Photos reviewed again after import
[ ] Bad photos removed or rejected
[ ] Edits completed
[ ] Final gallery reviewed

EXPORT
[ ] Full-res JPGs exported to 03_Finals/Full Resolution
[ ] Web-size JPGs exported to 03_Finals/Web Size (if needed)
[ ] Sneak peeks copied to 04_Delivery/Sneak Peeks (if needed)
[ ] Final gallery copied to 04_Delivery/Final Gallery
[ ] Social files copied to 04_Delivery/Social Media (if needed)

BACKUP & DELIVERY
[ ] Full shoot folder backed up
[ ] Lightroom catalog backed up
[ ] Client gallery delivered
[ ] Payment complete (if applicable)
[ ] SD card is safe to format
`;

// ── Structured guide data ────────────────────────────────────────────────────

const WORKFLOW_STEPS = [
  { type: 'warning', title: 'Safety Rule — Do Not Format the SD Card Yet', body: 'Never format the SD card until the shoot is fully backed up and delivered.', items: ['Back up the full SD card first', 'Import selected photos into Lightroom', 'Edit and export all finals', 'Back up the full shoot folder', 'Deliver the gallery', 'Only then format the SD card'] },
  { step: 1,  title: 'Back Up the Full SD Card', body: 'Before opening Lightroom, copy the entire card to a safe location.', items: ['Insert SD card into the Mac', 'Open Finder → find the card in the sidebar', 'Copy the full DCIM folder to an external drive', 'Name the backup: ShootName_FULL_CARD_BACKUP', 'Do not delete anything from the card yet'] },
  { step: 2,  title: 'Open Lightroom Classic', body: 'Open Lightroom Classic — not the cloud version of Lightroom.' },
  { step: 3,  title: 'Create a New Catalog', items: ['File → New Catalog', 'Navigate into 01_Catalog inside this shoot folder', 'Name the catalog after the shoot (e.g. Ariana_Engagement_Catalog)', 'Click Create'] },
  { step: 4,  title: 'Open the Import Window', items: ['Go to the Library section', 'Click Import (bottom-left)', 'Or: File → Import Photos And Video'] },
  { step: 5,  title: 'Select the SD Card as Source', items: ['Left panel → Source → click the SD card', 'Wait for image previews to load'] },
  { step: 6,  type: 'important', title: 'Choose COPY at the Top', body: 'Select COPY — not Add, not Move. This copies files off the card without removing them.' },
  { step: 7,  title: 'Uncheck All, Then Select Keepers', items: ['Click Uncheck All', 'Check only sharp, in-focus, keeper photos', 'Leave test shots, blurry, and closed-eye photos unchecked'] },
  { step: 8,  type: 'important', title: 'Set Destination to 02_RAW', body: 'Right panel → Destination → choose 02_RAW inside this shoot folder. This is the most important step.' },
  { step: 9,  title: 'Click Import', body: 'Final check: Source = SD card · COPY selected · Destination = 02_RAW. Then click Import.' },
  { step: 10, title: 'Second Cull Inside Lightroom', body: 'Review again after import. Delete or reject anything that is not actually good.' },
  { step: 11, title: 'Edit the Photos', body: 'Go to the Develop section.', items: ['Apply preset', 'Fix white balance and exposure', 'Adjust contrast, highlights, shadows', 'Crop and straighten', 'Fix skin tones', 'Sync edits across similar photos'] },
  { step: 12, title: 'Export Full Resolution', items: ['File → Export → Hard Drive', 'Folder: 03_Finals / Full Resolution', 'JPEG · sRGB · Quality 90–100 · Resize Off · Sharpening Standard'] },
  { step: 13, title: 'Export Web Size', items: ['File → Export → Hard Drive', 'Folder: 03_Finals / Web Size', 'JPEG · sRGB · Quality 80–90 · Long Edge 2048–2500 px'] },
  { step: 14, title: 'Prepare Delivery Folders', items: ['Sneak Peeks → 04_Delivery / Sneak Peeks', 'Final gallery → 04_Delivery / Final Gallery', 'Social crops → 04_Delivery / Social Media'] },
  { step: 15, title: 'Back Up the Full Shoot Folder', body: 'Back up to an external drive and/or cloud before formatting the SD card.' },
  { step: 16, title: 'Back Up the Lightroom Catalog', items: ['Lightroom Classic → Catalog Settings → Backups', 'Recommended: Once A Week When Exiting Lightroom', 'Click Back Up when prompted'] },
  { step: 17, type: 'warning', title: 'Now Safe to Format the SD Card', body: 'Only format after every item in the shoot checklist is complete.' },
];

const CHECKLIST_SECTIONS = [
  { id: 'setup',   title: 'Setup',              items: ['Shoot folder created', 'Folder name is correct', '01_Catalog folder exists', '02_RAW folder exists', '03_Finals folder exists', '04_Delivery folder exists (if needed)'] },
  { id: 'sdcard',  title: 'SD Card Backup',     items: ['SD card inserted', 'Full SD card copied to backup location', 'Backup folder name includes shoot name', 'SD card has NOT been formatted'] },
  { id: 'catalog', title: 'Lightroom Catalog',  items: ['Lightroom Classic opened', 'File → New Catalog clicked', 'Catalog saved inside 01_Catalog', 'Catalog name matches the shoot'] },
  { id: 'import',  title: 'Import',             items: ['Import window opened', 'SD card selected on the left side', 'COPY selected at the top', 'Uncheck All clicked', 'Keeper photos checked', 'Destination set to 02_RAW', "Don't Import Suspected Duplicates = ON", 'Import clicked'] },
  { id: 'editing', title: 'Editing',            items: ['Photos reviewed again after import', 'Bad photos removed or rejected', 'Edits completed', 'Final gallery reviewed'] },
  { id: 'export',  title: 'Export',             items: ['Full-res JPGs → 03_Finals / Full Resolution', 'Web-size JPGs → 03_Finals / Web Size (if needed)', 'Sneak peeks → 04_Delivery / Sneak Peeks (if needed)', 'Final gallery → 04_Delivery / Final Gallery', 'Social files → 04_Delivery / Social Media (if needed)'] },
  { id: 'backup',  title: 'Backup & Delivery',  items: ['Full shoot folder backed up', 'Lightroom catalog backed up', 'Client gallery delivered', 'Payment complete (if applicable)', 'SD card is safe to format'] },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeFolderName(shootName, shootType, date) {
  const dateStr = date || new Date().toISOString().slice(0, 10);
  const combined = [shootName.trim(), shootType.trim()].filter(Boolean).join(' ');
  const safe = combined
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (!safe) return dateStr;
  return `${dateStr}_${safe}`;
}

function toggleTreeNode(tree, nodeId, enabled) {
  return tree.map(node => {
    if (node.id === nodeId) {
      return {
        ...node,
        enabled,
        children: !enabled
          ? (node.children || []).map(c => ({ ...c, enabled: false }))
          : (node.children || []),
      };
    }
    if (node.children?.length) {
      const childIdx = node.children.findIndex(c => c.id === nodeId);
      if (childIdx !== -1) {
        const newChildren = node.children.map(c => c.id === nodeId ? { ...c, enabled } : c);
        return {
          ...node,
          enabled: enabled ? true : node.enabled,
          children: newChildren,
        };
      }
    }
    return node;
  });
}

function flattenEnabledTree(tree) {
  const items = [];
  for (const node of tree) {
    if (!node.enabled) continue;
    if (node.type === 'folder') {
      items.push({ relativePath: node.name, type: 'folder' });
      for (const child of (node.children || [])) {
        if (!child.enabled) continue;
        if (child.type === 'folder') {
          items.push({ relativePath: `${node.name}/${child.name}`, type: 'folder' });
        } else {
          items.push({ relativePath: `${node.name}/${child.name}`, type: 'file', content: getFileContent(child.id) });
        }
      }
    } else {
      items.push({ relativePath: node.name, type: 'file', content: getFileContent(node.id) });
    }
  }
  return items;
}

function getFileContent(nodeId) {
  if (nodeId === 'readme') return README_CONTENT;
  if (nodeId === 'checklist') return CHECKLIST_CONTENT;
  return '';
}

function isElectron() {
  return typeof window !== 'undefined' && !!window.electronAPI?.shootCreateFolder;
}

// ── Tree Preview Component ────────────────────────────────────────────────────

function TreePreviewLine({ prefix, name, isLast, type }) {
  const connector = isLast ? '└── ' : '├── ';
  return (
    <div className="flex items-center gap-1.5 font-mono text-xs text-[#5F6F65] leading-5">
      <span className="text-[#C8C0B8] whitespace-pre">{prefix}{connector}</span>
      {type === 'file'
        ? <FileText size={11} className="text-[#9C8A7A] shrink-0" />
        : <Folder size={11} className="text-[#5F6F65] shrink-0" />}
      <span className={type === 'file' ? 'text-[#9C8A7A]' : ''}>{name}</span>
    </div>
  );
}

function FolderTreePreview({ folderName, tree }) {
  const lines = [];
  const enabledRoots = tree.filter(n => n.enabled);
  enabledRoots.forEach((node, ri) => {
    const rootLast = ri === enabledRoots.length - 1;
    lines.push({ prefix: '', name: node.name, isLast: rootLast, type: node.type });
    if (node.type === 'folder' && node.children?.length) {
      const enabledChildren = node.children.filter(c => c.enabled);
      enabledChildren.forEach((child, ci) => {
        const childLast = ci === enabledChildren.length - 1;
        lines.push({ prefix: rootLast ? '    ' : '│   ', name: child.name, isLast: childLast, type: child.type });
      });
    }
  });

  return (
    <div className="bg-[#F8F6F3] border border-[#E8E4E1] rounded-2xl p-4 font-mono text-xs overflow-x-auto">
      <div className="flex items-center gap-1.5 mb-2">
        <Folder size={13} className="text-[#5F6F65]" />
        <span className="text-[#2C2511] font-bold">{folderName || 'YYYY-MM-DD_ShootName'}/</span>
      </div>
      {lines.length === 0
        ? <div className="text-[#C8C0B8] italic pl-4">No folders enabled</div>
        : lines.map((l, i) => <TreePreviewLine key={i} {...l} />)
      }
    </div>
  );
}

// ── Tree Editor Row ───────────────────────────────────────────────────────────

function TreeRow({ node, isChild, onToggle, parentEnabled }) {
  const disabled = isChild && !parentEnabled;
  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-xl transition-colors ${disabled ? 'opacity-40' : 'hover:bg-[#F8F6F3]'}`}>
      {isChild && <div className="w-4 shrink-0" />}
      <button
        onClick={() => !disabled && onToggle(node.id, !node.enabled)}
        disabled={disabled}
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
          node.enabled && !disabled
            ? 'bg-[#5F6F65] border-[#5F6F65]'
            : 'border-[#D8D0C8] bg-white'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {node.enabled && !disabled && <Check size={11} strokeWidth={3} className="text-white" />}
      </button>
      {node.type === 'file'
        ? <FileText size={14} className="text-[#9C8A7A] shrink-0" />
        : <Folder size={14} className={`shrink-0 ${node.enabled && !disabled ? 'text-[#5F6F65]' : 'text-[#C8C0B8]'}`} />}
      <span className={`text-sm font-medium ${node.enabled && !disabled ? 'text-[#2C2511]' : 'text-[#B0A090]'}`}>
        {node.name}
      </span>
    </div>
  );
}

// ── Workflow Display ──────────────────────────────────────────────────────────

function WorkflowDisplay() {
  return (
    <div className="space-y-4">
      {WORKFLOW_STEPS.map((s, i) => {
        if (s.type === 'warning') {
          return (
            <div key={i} className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4">
              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-base font-black text-amber-900">{s.title}</p>
                {s.body && <p className="text-sm text-amber-700 mt-1.5 leading-relaxed">{s.body}</p>}
                {s.items && (
                  <ol className="mt-3 space-y-1.5">
                    {s.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-amber-800">
                        <span className="font-black text-amber-500 shrink-0 w-4">{j + 1}.</span>
                        {item}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          );
        }
        if (s.type === 'important') {
          return (
            <div key={i} className="flex gap-4 bg-[#F0F6F2] border border-[#C4D9CC] rounded-2xl p-5">
              <div className="w-7 h-7 rounded-full bg-[#5F6F65] text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{s.step}</div>
              <div>
                <p className="text-base font-black text-[#2C4A38]">{s.title}</p>
                {s.body && <p className="text-sm text-[#3D6A50] mt-1.5 leading-relaxed font-medium">{s.body}</p>}
              </div>
            </div>
          );
        }
        return (
          <div key={i} className="flex gap-4">
            <div className="w-7 h-7 rounded-full bg-[#F4F1EE] border border-[#E0D8D0] text-[#9C8A7A] text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{s.step}</div>
            <div className="flex-1 pb-4 border-b border-[#F2EFE9] last:border-0">
              <p className="text-base font-bold text-[#2C2511]">{s.title}</p>
              {s.body && <p className="text-sm text-[#6A5A4A] mt-1.5 leading-relaxed">{s.body}</p>}
              {s.items && (
                <ul className="mt-2.5 space-y-1.5">
                  {s.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-[#6A5A4A]">
                      <Circle size={5} className="text-[#9C8A7A] shrink-0 mt-1.5 fill-[#9C8A7A]" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Checklist Display ─────────────────────────────────────────────────────────

function ChecklistDisplay() {
  const [checked, setChecked] = useState({});

  const toggle = (key) => setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  const totalItems = CHECKLIST_SECTIONS.reduce((n, s) => n + s.items.length, 0);
  const totalChecked = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((totalChecked / totalItems) * 100);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[#9C8A7A]">{totalChecked} / {totalItems} complete</span>
          {totalChecked > 0 && (
            <button
              onClick={() => setChecked({})}
              className="flex items-center gap-1.5 text-xs font-bold text-[#C8C0B8] hover:text-rose-400 transition-colors cursor-pointer"
            >
              <RotateCcw size={11} />Reset all
            </button>
          )}
        </div>
        <div className="h-1.5 bg-[#F2EFE9] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#5F6F65] rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      {CHECKLIST_SECTIONS.map(section => {
        const sectionChecked = section.items.filter((_, i) => checked[`${section.id}-${i}`]).length;
        const sectionDone = sectionChecked === section.items.length;
        return (
          <div key={section.id}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black uppercase tracking-wider text-[#9C8A7A]">{section.title}</p>
              {sectionDone
                ? <CheckCircle2 size={14} className="text-[#5F6F65]" />
                : <span className="text-xs font-bold text-[#C8C0B8]">{sectionChecked}/{section.items.length}</span>}
            </div>
            <div className="space-y-1">
              {section.items.map((item, i) => {
                const key = `${section.id}-${i}`;
                const done = !!checked[key];
                return (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#F4F1EE] transition-colors cursor-pointer group text-left"
                  >
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${done ? 'bg-[#5F6F65] border-[#5F6F65]' : 'border-[#D8D0C8] bg-white group-hover:border-[#5F6F65]/40'}`}>
                      {done && <Check size={13} strokeWidth={3} className="text-white" />}
                    </div>
                    <span className={`text-base leading-snug transition-colors ${done ? 'line-through text-[#C8C0B8]' : 'text-[#2C2511]'}`}>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────

export default function ShootBuilderView() {
  const { state, updateState } = useAppState();
  const settings = state.shootFolderSettings || {};
  const folderTree = settings.folderTree || DEFAULT_SHOOT_FOLDER_TREE;
  const parentFolderPath = settings.parentFolderPath || '';
  const autoOpen = settings.autoOpen !== false;

  const today = new Date().toISOString().slice(0, 10);
  const [shootName, setShootName] = useState('');
  const [shootType, setShootType] = useState('');
  const [shootDate, setShootDate] = useState(today);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [readmeOpen, setReadmeOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | creating | success | duplicate | error
  const [createdPath, setCreatedPath] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [treePreviewOpen, setTreePreviewOpen] = useState(false);

  const folderName = useMemo(
    () => sanitizeFolderName(shootName, shootType, shootDate),
    [shootName, shootType, shootDate]
  );

  const fullPath = useMemo(
    () => parentFolderPath ? `${parentFolderPath}/${folderName}` : '',
    [parentFolderPath, folderName]
  );

  const updateSettings = useCallback((patch) => {
    updateState({ shootFolderSettings: { ...settings, ...patch } });
  }, [settings, updateState]);

  const handleToggleNode = useCallback((nodeId, enabled) => {
    updateSettings({ folderTree: toggleTreeNode(folderTree, nodeId, enabled) });
  }, [folderTree, updateSettings]);

  const handleChooseFolder = useCallback(async () => {
    const picked = await window.electronAPI.shootChooseFolder();
    if (picked) updateSettings({ parentFolderPath: picked });
  }, [updateSettings]);

  const handleCreate = useCallback(async (nameOverride) => {
    const targetName = nameOverride || folderName;
    const targetPath = `${parentFolderPath}/${targetName}`;

    if (!shootName.trim()) {
      toast.error('Enter a shoot name first.');
      return;
    }
    if (!parentFolderPath) {
      toast.error('Choose a parent folder in Settings first.');
      return;
    }

    setStatus('creating');

    const exists = await window.electronAPI.shootCheckExists(targetPath);
    if (exists && !nameOverride) {
      setStatus('duplicate');
      return;
    }

    const items = flattenEnabledTree(folderTree);
    const result = await window.electronAPI.shootCreateFolder({ folderPath: targetPath, items });

    if (!result.success) {
      setStatus('error');
      setErrorMsg(result.error || 'Unknown error');
      return;
    }

    setCreatedPath(targetPath);
    setStatus('success');
    if (autoOpen) window.electronAPI.shootOpenFolder(targetPath);
  }, [folderName, parentFolderPath, shootName, folderTree, autoOpen]);

  const handleDuplicateChoice = useCallback(async (choice) => {
    if (choice === 'open') {
      await window.electronAPI.shootOpenFolder(fullPath);
      setStatus('idle');
    } else if (choice === 'new') {
      await handleCreate(`${folderName}_02`);
    } else {
      setStatus('idle');
    }
  }, [fullPath, folderName, handleCreate]);

  const handleReset = useCallback(() => {
    setShootName('');
    setShootType('');
    setShootDate(today);
    setStatus('idle');
    setCreatedPath('');
    setErrorMsg('');
  }, [today]);

  const noElectron = !isElectron();

  return (
    <div className="p-8 space-y-8">
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#2C2511] tracking-tight">Shoot Folder Builder</h1>
        <p className="text-sm text-[#9C8A7A] mt-1">Create a clean, repeatable folder structure for every shoot.</p>
      </div>

      {/* Desktop-only banner */}
      {noElectron && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 font-medium">Folder creation requires the desktop app. This preview is read-only in the browser.</p>
        </div>
      )}

      {/* No parent folder warning */}
      {!noElectron && !parentFolderPath && (
        <div className="flex items-start gap-3 bg-[#FFF8F0] border border-[#F0DCC4] rounded-2xl p-4">
          <AlertTriangle size={16} className="text-[#D4A373] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-[#8A5A2A] font-semibold">No parent folder selected.</p>
            <p className="text-xs text-[#B07040] mt-0.5">Open Settings below and choose where shoot folders will be created.</p>
          </div>
        </div>
      )}

      {/* ── CREATE SHOOT SECTION ─────────────────────────────────────── */}
      <div className="bg-white border border-[#E8E4E1] rounded-3xl p-6 space-y-5">

        {status === 'success' ? (
          /* Success state */
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F0F6F2] flex items-center justify-center">
                <CheckCircle2 size={20} className="text-[#5F6F65]" />
              </div>
              <div>
                <p className="font-black text-[#2C2511]">Shoot folder created!</p>
                <p className="text-xs text-[#9C8A7A] mt-0.5 break-all">{createdPath}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => window.electronAPI.shootOpenFolder(createdPath)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#5F6F65] text-white text-sm font-bold rounded-xl hover:bg-[#4A5A50] transition-colors cursor-pointer"
              >
                <FolderOpen size={15} />
                Open in Finder
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#F4F1EE] text-[#5F6F65] text-sm font-bold rounded-xl hover:bg-[#EAE6E2] transition-colors cursor-pointer"
              >
                <FolderPlus size={15} />
                Create Another
              </button>
            </div>
          </div>
        ) : status === 'duplicate' ? (
          /* Duplicate warning */
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900">A folder with this name already exists.</p>
                <p className="text-xs text-amber-700 mt-0.5 break-all font-mono">{fullPath}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleDuplicateChoice('open')}
                className="px-4 py-2.5 bg-[#5F6F65] text-white text-sm font-bold rounded-xl hover:bg-[#4A5A50] transition-colors cursor-pointer"
              >
                Open Existing
              </button>
              <button
                onClick={() => handleDuplicateChoice('new')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#F4F1EE] text-[#5F6F65] text-sm font-bold rounded-xl hover:bg-[#EAE6E2] transition-colors cursor-pointer"
              >
                <Copy size={13} />
                Create as _02
              </button>
              <button
                onClick={() => setStatus('idle')}
                className="px-4 py-2.5 bg-white border border-[#E8E4E1] text-[#9C8A7A] text-sm font-bold rounded-xl hover:bg-[#F8F6F3] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : status === 'error' ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl p-4">
              <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-rose-900">Failed to create folder.</p>
                <p className="text-xs text-rose-700 mt-0.5 font-mono">{errorMsg}</p>
              </div>
            </div>
            <button
              onClick={() => setStatus('idle')}
              className="px-4 py-2.5 bg-[#F4F1EE] text-[#5F6F65] text-sm font-bold rounded-xl hover:bg-[#EAE6E2] transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : (
          /* Main create form */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-[#9C8A7A] uppercase tracking-wider mb-1.5">Shoot Name</label>
                <input
                  type="text"
                  value={shootName}
                  onChange={e => setShootName(e.target.value)}
                  placeholder="e.g. Ariana"
                  className="w-full px-4 py-3 bg-[#F8F6F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] placeholder-[#C8C0B8] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30 focus:border-[#5F6F65] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#9C8A7A] uppercase tracking-wider mb-1.5">Shoot Type</label>
                <input
                  type="text"
                  value={shootType}
                  onChange={e => setShootType(e.target.value)}
                  placeholder="e.g. Engagement"
                  className="w-full px-4 py-3 bg-[#F8F6F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] placeholder-[#C8C0B8] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30 focus:border-[#5F6F65] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#9C8A7A] uppercase tracking-wider mb-1.5">Shoot Date</label>
                <input
                  type="date"
                  value={shootDate}
                  onChange={e => setShootDate(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F8F6F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30 focus:border-[#5F6F65] transition-colors"
                />
              </div>
            </div>

            {/* Folder name preview */}
            {shootName.trim() && (
              <div className="bg-[#F4F1EE] rounded-2xl px-4 py-3 space-y-1">
                <p className="text-[10px] font-bold text-[#9C8A7A] uppercase tracking-wider">Folder Name</p>
                <p className="text-sm font-mono font-bold text-[#5F6F65] break-all">{folderName}/</p>
                {fullPath && (
                  <p className="text-[10px] text-[#B0A090] font-mono break-all">{fullPath}</p>
                )}
              </div>
            )}

            {/* Tree preview accordion */}
            <button
              onClick={() => setTreePreviewOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-[#F8F6F3] border border-[#E8E4E1] rounded-xl text-sm font-bold text-[#5F6F65] hover:bg-[#F4F1EE] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2"><Folder size={14} />Preview Folder Tree</span>
              {treePreviewOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {treePreviewOpen && (
              <FolderTreePreview
                folderName={shootName.trim() ? folderName : ''}
                tree={folderTree}
              />
            )}

            <button
              onClick={() => handleCreate()}
              disabled={noElectron || !shootName.trim() || !parentFolderPath || status === 'creating'}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#5F6F65] text-white text-sm font-black rounded-xl hover:bg-[#4A5A50] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <FolderPlus size={16} />
              {status === 'creating' ? 'Creating…' : 'Create Shoot Folder'}
            </button>
          </div>
        )}
      </div>

      {/* ── SETTINGS ACCORDION ───────────────────────────────────────── */}
      <div className="bg-white border border-[#E8E4E1] rounded-3xl overflow-hidden">
        <button
          onClick={() => setSettingsOpen(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#FDFCFB] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2.5 text-sm font-black text-[#2C2511]">
            <Settings2 size={16} className="text-[#5F6F65]" />
            Settings
          </span>
          {settingsOpen ? <ChevronDown size={16} className="text-[#9C8A7A]" /> : <ChevronRight size={16} className="text-[#9C8A7A]" />}
        </button>

        {settingsOpen && (
          <div className="px-6 pb-6 space-y-6 border-t border-[#F2EFE9]">

            {/* Parent folder */}
            <div className="pt-5 space-y-2">
              <p className="text-xs font-bold text-[#9C8A7A] uppercase tracking-wider">Default Parent Folder</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-[#F8F6F3] border border-[#E8E4E1] rounded-xl text-xs font-mono text-[#5F6F65] truncate min-w-0">
                  {parentFolderPath || <span className="text-[#C8C0B8]">No folder selected</span>}
                </div>
                {noElectron ? (
                  <span className="text-xs text-[#C8C0B8] shrink-0">Desktop only</span>
                ) : (
                  <button
                    onClick={handleChooseFolder}
                    className="shrink-0 px-4 py-3 bg-[#5F6F65] text-white text-xs font-bold rounded-xl hover:bg-[#4A5A50] transition-colors cursor-pointer"
                  >
                    Choose
                  </button>
                )}
              </div>
              {parentFolderPath && (
                <button
                  onClick={() => updateSettings({ parentFolderPath: '' })}
                  className="text-xs text-[#C8C0B8] hover:text-[#9C8A7A] transition-colors cursor-pointer"
                >
                  Reset folder
                </button>
              )}
            </div>

            {/* Auto-open toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#2C2511]">Auto-open folder after creation</span>
              <button
                onClick={() => updateSettings({ autoOpen: !autoOpen })}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${autoOpen ? 'bg-[#5F6F65]' : 'bg-[#D8D0C8]'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoOpen ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Folder tree editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#9C8A7A] uppercase tracking-wider">Folder Template</p>
                <div className="flex gap-1.5">
                  {[
                    { label: 'All', fn: () => updateSettings({ folderTree: ENABLE_ALL_TREE(folderTree) }) },
                    { label: 'Min', fn: () => updateSettings({ folderTree: DISABLE_OPTIONAL_TREE(folderTree) }) },
                    { label: 'Reset', fn: () => updateSettings({ folderTree: DEFAULT_SHOOT_FOLDER_TREE }) },
                  ].map(({ label, fn }) => (
                    <button
                      key={label}
                      onClick={fn}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-[#5F6F65] bg-[#F4F1EE] hover:bg-[#EAE6E2] rounded-lg transition-colors cursor-pointer"
                    >
                      {label === 'Reset' && <RotateCcw size={9} />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-[#E8E4E1] rounded-2xl overflow-hidden divide-y divide-[#F2EFE9]">
                {folderTree.map(node => (
                  <div key={node.id}>
                    <TreeRow
                      node={node}
                      isChild={false}
                      onToggle={handleToggleNode}
                      parentEnabled={true}
                    />
                    {(node.children || []).map(child => (
                      <TreeRow
                        key={child.id}
                        node={child}
                        isChild={true}
                        onToggle={handleToggleNode}
                        parentEnabled={node.enabled}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>

      {/* ── Reference Guides — own wider section ──────────────────── */}
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h2 className="text-lg font-black text-[#2C2511]">Reference Guides</h2>
          <p className="text-sm text-[#9C8A7A] mt-0.5">Keep open while you work — tap any checklist item to mark it done.</p>
        </div>

        {/* Lightroom Workflow */}
        <div className="bg-white border border-[#E8E4E1] rounded-3xl overflow-hidden">
          <button
            onClick={() => setReadmeOpen(v => !v)}
            className="w-full flex items-center justify-between px-6 py-5 hover:bg-[#FDFCFB] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F0F6F2] flex items-center justify-center shrink-0">
                <BookOpen size={16} className="text-[#5F6F65]" />
              </div>
              <div className="text-left">
                <p className="text-base font-black text-[#2C2511]">Lightroom Classic Workflow</p>
                <p className="text-xs text-[#9C8A7A] mt-0.5">Step-by-step import, edit, export &amp; backup guide</p>
              </div>
            </span>
            {readmeOpen
              ? <ChevronDown size={16} className="text-[#9C8A7A] shrink-0" />
              : <ChevronRight size={16} className="text-[#9C8A7A] shrink-0" />}
          </button>
          {readmeOpen && (
            <div className="border-t border-[#F2EFE9] bg-[#FDFCFB] px-6 py-6">
              <WorkflowDisplay />
            </div>
          )}
        </div>

        {/* Shoot Checklist */}
        <div className="bg-white border border-[#E8E4E1] rounded-3xl overflow-hidden">
          <button
            onClick={() => setChecklistOpen(v => !v)}
            className="w-full flex items-center justify-between px-6 py-5 hover:bg-[#FDFCFB] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FFF8F0] flex items-center justify-center shrink-0">
                <ClipboardList size={16} className="text-[#D4A373]" />
              </div>
              <div className="text-left">
                <p className="text-base font-black text-[#2C2511]">Shoot Checklist</p>
                <p className="text-xs text-[#9C8A7A] mt-0.5">SD card, import, edit, export &amp; delivery — check off as you go</p>
              </div>
            </span>
            {checklistOpen
              ? <ChevronDown size={16} className="text-[#9C8A7A] shrink-0" />
              : <ChevronRight size={16} className="text-[#9C8A7A] shrink-0" />}
          </button>
          {checklistOpen && (
            <div className="border-t border-[#F2EFE9] bg-[#FDFCFB] px-6 py-6">
              <ChecklistDisplay />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
