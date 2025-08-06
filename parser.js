const { getPluginLoader } = require('./pluginLoader');
const {calculateReadingTime, escapeHtml} = require('./utils');

async function parseMarkdown(markdown) {
    const pluginLoader = getPluginLoader();
    
    try {
        markdown = await pluginLoader.executeHook('beforeParse', markdown);
    } catch (error) {
        console.error('----------');
        console.error(error.message);
        throw error;
    }

    if (typeof markdown !== 'string') {
        throw new TypeError('Input must be a string');
    }

    let html = markdown;
    let frontmatter = {};
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const frontmatterMatch = html.match(frontmatterRegex);
    
    if (frontmatterMatch) {
        const frontmatterContent = frontmatterMatch[1];
        frontmatterContent.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length) {
                frontmatter[key.trim()] = valueParts.join(':').trim();
            }
        });
        html = html.slice(frontmatterMatch[0].length).trim();
    }

    // Protect code blocks
    const codeBlocks = new Map();
    let codeBlockId = 0;

    html = html.replace(/```([^\n]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const token = `%%CODEBLOCK${codeBlockId}%%`;
        codeBlocks.set(token, {
            language: lang.trim() || 'plaintext',
            code: code.trim()
        });
        codeBlockId++;
        return token;
    });

    // Handle inline code
    html = html.replace(/`([^`]+)`/g, (match, code) => {
        const token = `%%INLINECODE${codeBlockId}%%`;
        codeBlocks.set(token, {
            language: 'inline',
            code: code
        });
        codeBlockId++;
        return token;
    });

    // Improved list and paragraph processing
    let processedLines = [];
    let isInList = false;
    let currentListType = null;

    html.split('\n').forEach(line => {
        // Unordered list item detection
        const unorderedListMatch = line.match(/^[\*\-\+]\s+(.+)/);
        // Ordered list item detection
        const orderedListMatch = line.match(/^\d+\.\s+(.+)/);
        // Blockquote detection
        const blockquoteMatch = line.match(/^>\s*(.*)/);
        // Heading detection
        const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
        // Horizontal rule detection
        const hrMatch = line.match(/^(?:[\t ]*(?:-{3,}|\*{3,}|_{3,})[\t ]*?)$/);

        if (unorderedListMatch) {
            if (!isInList || currentListType !== 'ul') {
                // Start of a new unordered list
                processedLines.push('<ul>');
                isInList = true;
                currentListType = 'ul';
            }
            processedLines.push(`<li>${unorderedListMatch[1]}</li>`);
        } else if (orderedListMatch) {
            if (!isInList || currentListType !== 'ol') {
                // Start of a new ordered list
                processedLines.push('<ol>');
                isInList = true;
                currentListType = 'ol';
            }
            processedLines.push(`<li>${orderedListMatch[1]}</li>`);
        } else if (blockquoteMatch) {
            // Close any open list
            if (isInList) {
                processedLines.push(currentListType === 'ul' ? '</ul>' : '</ol>');
                isInList = false;
                currentListType = null;
            }
            processedLines.push(`<blockquote>${blockquoteMatch[1]}</blockquote>`);
        } else if (headingMatch) {
            // Close any open list
            if (isInList) {
                processedLines.push(currentListType === 'ul' ? '</ul>' : '</ol>');
                isInList = false;
                currentListType = null;
            }
            // Convert heading based on number of #
            const headingLevel = headingMatch[1].length;
            processedLines.push(`<h${headingLevel}>${headingMatch[2]}</h${headingLevel}>`);
        } else if (hrMatch) {
            // Close any open list
            if (isInList) {
                processedLines.push(currentListType === 'ul' ? '</ul>' : '</ol>');
                isInList = false;
                currentListType = null;
            }
            processedLines.push('<hr>');
        } else {
            // Not a list item
            if (isInList) {
                // Close the previous list
                processedLines.push(currentListType === 'ul' ? '</ul>' : '</ol>');
                isInList = false;
                currentListType = null;
            }

            // Trim the line and add non-empty lines as paragraphs
            const trimmedLine = line.trim();
            if (trimmedLine) {
                processedLines.push(`<p>${trimmedLine}</p>`);
            }
        }
    });

    // Close any open list at the end
    if (isInList) {
        processedLines.push(currentListType === 'ul' ? '</ul>' : '</ol>');
    }

    // Join the processed lines
    let processedContent = processedLines.join('\n');

    // Additional Markdown conversions
    processedContent = processedContent.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
    processedContent = processedContent.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
    processedContent = processedContent.replace(/~~(.*?)~~/g, '<del>$1</del>');
    processedContent = processedContent.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, 
        (match, alt, url) => `<img src="${url}" alt="${alt}">`);
    processedContent = processedContent.replace(/\[([^\]]+)\]\(([^)"]+)(?:\s+"([^"]+)")?\)/g, 
        (match, text, url, title) => `<a href="${url}"${title ? ` title="${title}"` : ''}>${text}</a>`);

    // Restore code blocks
    processedContent = processedContent.replace(/%%INLINECODE\d+%%/g, match => {
        const block = codeBlocks.get(match);
        return `<code class="inline">${escapeHtml(block.code)}</code>`;
    });

    processedContent = processedContent.replace(/%%CODEBLOCK\d+%%/g, match => {
        const block = codeBlocks.get(match);
        return `<pre><code class="language-${block.language}">${escapeHtml(block.code)}</code></pre>`;
    });

    const readingTime = calculateReadingTime(processedContent);
    frontmatter.readingTime = readingTime;

    try {
        const [newHtml, newFrontmatter] = await pluginLoader.executeHook('afterParse', processedContent, frontmatter);
        processedContent = newHtml;
        frontmatter = newFrontmatter;
    } catch (error) {
        console.error('----------');
        console.error(error.message);
        throw error;
    }

    return {
        content: processedContent.trim(),
        frontmatter
    };
}

module.exports = {
    parseMarkdown
};