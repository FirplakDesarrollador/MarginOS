const fs = require('fs');
const path = require('path');

// Reusable CSS class components to be mapped
const mappings = [
  {
    regex: /\b(bg-brand-primary\s+text-white\s+hover:bg-brand-accent\s+transition-(?:colors|all)\s+disabled:opacity-50\s+shadow-sm)\b/g,
    replacement: 'btn-primary'
  },
  {
    regex: /\b(bg-brand-primary\s+text-white\s+hover:bg-brand-accent\s+transition-(?:colors|all)\s+shadow-sm\s+disabled:opacity-50)\b/g,
    replacement: 'btn-primary'
  },
  {
    regex: /\b(bg-brand-primary\s+text-white\s+hover:bg-brand-accent\s+transition-(?:colors|all)\s+disabled:opacity-50)\b/g,
    replacement: 'btn-primary'
  },
  {
    regex: /\b(bg-surface-card\s+border\s+border-border-subtle\s+text-text-primary\s+hover:border-brand-primary\/30\s+hover:text-brand-primary\s+shadow-sm\s+transition-(?:colors|all)\s+disabled:opacity-50)\b/g,
    replacement: 'btn-secondary'
  },
  {
    regex: /\b(bg-surface-card\s+border\s+border-border-subtle\s+text-text-primary\s+hover:border-brand-primary\/30\s+hover:text-brand-primary\s+transition-(?:colors|all)\s+disabled:opacity-50)\b/g,
    replacement: 'btn-secondary'
  },
  {
    regex: /\b(bg-transparent\s+text-text-muted\s+hover:text-text-primary\s+hover:bg-surface-hover\s+transition-(?:colors|all)\s+disabled:opacity-50)\b/g,
    replacement: 'btn-ghost'
  },
  {
    regex: /\b(bg-red-600\s+text-white\s+hover:bg-red-700\s+transition-(?:colors|all)\s+shadow-sm\s+disabled:opacity-50)\b/g,
    replacement: 'btn-danger'
  }
];

// Fallbacks for less complete strings
const fallbacks = [
  {
    regex: /\bbg-brand-primary\s+text-white\b/g,
    replacement: 'btn-primary'
  },
  {
    regex: /\bbg-surface-card\s+text-text-primary\s+border\s+border-border-subtle\b/g,
    replacement: 'btn-secondary'
  },
  {
    regex: /\btext-text-muted\s+hover:text-text-primary\s+hover:bg-surface-hover\b/g,
    replacement: 'btn-ghost'
  }
];

function cleanClasses(className) {
    // Remove redundant tailwind classes that are now in btn-*
    const toRemove = [
        'bg-brand-primary', 'text-white', 'hover:bg-brand-accent',
        'bg-surface-card', 'border', 'border-border-subtle', 'text-text-primary', 'hover:border-brand-primary/30', 'hover:text-brand-primary',
        'text-text-muted', 'hover:bg-surface-hover',
        'bg-red-600', 'hover:bg-red-700',
        'shadow-sm', 'transition-all', 'transition-colors', 'disabled:opacity-50'
    ];
    let arr = className.split(/\s+/);
    
    // Determine variant based on presence of specific classes
    let variant = '';
    if (arr.includes('bg-brand-primary') && arr.includes('text-white')) variant = 'btn-primary';
    else if (arr.includes('bg-surface-card') && arr.includes('border') && arr.includes('border-border-subtle')) variant = 'btn-secondary';
    else if (arr.includes('text-text-muted') && arr.includes('hover:bg-surface-hover')) variant = 'btn-ghost';
    else if (arr.includes('bg-red-600') && arr.includes('text-white')) variant = 'btn-danger';
    
    if (variant) {
        arr = arr.filter(c => !toRemove.includes(c));
        arr.unshift(variant);
    }
    
    return arr.join(' ').replace(/\s{2,}/g, ' ').trim();
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Use regex to find className="..." or className={`...`}
    const classNameRegex = /className=(["'])(.*?)\1/g;
    content = content.replace(classNameRegex, (match, quote, classStr) => {
        const cleaned = cleanClasses(classStr);
        if (cleaned !== classStr) {
            return `className=${quote}${cleaned}${quote}`;
        }
        return match;
    });

    const classNameTemplateRegex = /className=\{`([^`]+)`\}/g;
    content = content.replace(classNameTemplateRegex, (match, classStr) => {
        const cleaned = cleanClasses(classStr);
        if (cleaned !== classStr) {
             return `className={\`${cleaned}\`}`;
        }
        return match;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            processFile(fullPath);
        }
    }
}

walk('./src');
