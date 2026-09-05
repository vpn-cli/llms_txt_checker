/**
 * AST-based Markdown parser using unified + remark-parse.
 *
 * Extracts: H1, blockquote, H2 sections, list items, Markdown links
 * with titles and descriptions.
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { Root, Heading, Blockquote, List, ListItem, Link, Text, Paragraph } from 'mdast';
import type { ParsedMarkdown, ParsedSection, ParsedLink } from '@/types/audit';

type MdastNode = Root | Heading | Blockquote | List | ListItem | Link | Text | Paragraph | { type: string; children?: MdastNode[]; value?: string; url?: string; title?: string | null };

/**
 * Extract all text from an AST node recursively.
 */
function extractText(node: MdastNode): string {
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map(extractText).join('');
  }
  return '';
}

/**
 * Extract Markdown links from a list item.
 * Expected format: [Title](url): Description
 * or:              [Title](url) — Description
 */
function extractLinkFromListItem(
  node: MdastNode,
  sectionName: string
): ParsedLink | null {
  if (!('children' in node) || !Array.isArray(node.children)) return null;

  // Look for paragraph children that contain links
  for (const child of node.children) {
    if (child.type !== 'paragraph') continue;
    if (!('children' in child) || !Array.isArray(child.children)) continue;

    for (const inline of child.children) {
      if (inline.type === 'link' && 'url' in inline) {
        const title = extractText(inline).trim();
        const url = (inline as { url: string }).url;

        // Get description — text after the link
        const fullText = extractText(child);
        const linkEnd = fullText.indexOf(title) + title.length;
        let description = fullText.slice(linkEnd).trim();

        // Clean up description separators
        description = description
          .replace(/^[:\-–—]\s*/, '')  // Remove leading separators
          .trim();

        return { title, url, description, section: sectionName };
      }
    }
  }

  return null;
}

/**
 * Parse Markdown content into a structured representation.
 */
export function parseMarkdown(content: string): ParsedMarkdown {
  const tree = unified().use(remarkParse).parse(content) as Root;

  let h1: string | null = null;
  let blockquote: string | null = null;
  const sections: ParsedSection[] = [];
  const allLinks: ParsedLink[] = [];

  let currentSection: ParsedSection | null = null;

  for (const node of tree.children) {
    // Extract H1
    if (node.type === 'heading' && (node as Heading).depth === 1 && !h1) {
      h1 = extractText(node as MdastNode).trim();
      continue;
    }

    // Extract first blockquote (summary)
    if (node.type === 'blockquote' && blockquote === null) {
      blockquote = extractText(node as MdastNode).trim();
      continue;
    }

    // H2 sections
    if (node.type === 'heading' && (node as Heading).depth === 2) {
      const heading = extractText(node as MdastNode).trim();
      currentSection = {
        heading,
        level: 2,
        links: [],
        content: '',
      };
      sections.push(currentSection);
      continue;
    }

    // Higher-level headings (H3, H4, etc.) — part of current section
    if (node.type === 'heading' && (node as Heading).depth > 2) {
      // Just track as section content
      if (currentSection) {
        currentSection.content += extractText(node as MdastNode).trim() + '\n';
      }
      continue;
    }

    // Lists — extract links
    if (node.type === 'list') {
      const listNode = node as List;
      const sectionName = currentSection?.heading || 'Root';

      for (const item of listNode.children) {
        if (item.type === 'listItem') {
          const link = extractLinkFromListItem(item as MdastNode, sectionName);
          if (link) {
            allLinks.push(link);
            if (currentSection) {
              currentSection.links.push(link);
            }
          }
        }
      }
      continue;
    }

    // Paragraphs — add to current section content
    if (node.type === 'paragraph' && currentSection) {
      currentSection.content += extractText(node as MdastNode).trim() + '\n';
    }
  }

  return {
    h1,
    blockquote,
    sections,
    links: allLinks,
    raw: content,
  };
}
