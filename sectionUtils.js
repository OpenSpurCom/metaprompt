// Pure markdown parse/patch utilities. No LLM calls.
// Uses mdast-util-from-markdown and mdast-util-to-markdown (ESM-only packages),
// loaded lazily via dynamic import() to stay compatible with "type": "commonjs".

let _fromMarkdown, _toMarkdown;
async function getMdastUtils() {
  if (!_fromMarkdown) {
    ({ fromMarkdown: _fromMarkdown } = await import('mdast-util-from-markdown'));
    ({ toMarkdown: _toMarkdown } = await import('mdast-util-to-markdown'));
  }
  return { fromMarkdown: _fromMarkdown, toMarkdown: _toMarkdown };
}

// indexSections(content: string)
// → Array<{ sectionIdx, nodeIndex, depth, heading }>
// Enumerates all heading nodes in document order.
// sectionIdx: 0-based count of headings seen so far.
// nodeIndex: position of the heading node in tree.children.
async function indexSections(content) {
  const { fromMarkdown } = await getMdastUtils();
  const tree = fromMarkdown(content);
  const sections = [];
  tree.children.forEach((node, nodeIndex) => {
    if (node.type === 'heading') {
      sections.push({
        sectionIdx: sections.length,
        nodeIndex,
        depth: node.depth,
        heading: node.children.map(c => c.value || '').join('')
      });
    }
  });
  return sections;
}

// extractSection(content: string, nodeIndex: number, depth: number)
// → { sectionMarkdown: string, nodeCount: number }
// Extracts the heading at nodeIndex plus all following nodes up to
// (not including) the next heading with depth <= the given depth.
// nodeCount is the number of tree.children entries the section spans.
async function extractSection(content, nodeIndex, depth) {
  const { fromMarkdown, toMarkdown } = await getMdastUtils();
  const tree = fromMarkdown(content);
  const children = tree.children;
  let end = nodeIndex + 1;
  while (end < children.length) {
    const n = children[end];
    if (n.type === 'heading' && n.depth <= depth) break;
    end++;
  }
  const nodeCount = end - nodeIndex;
  const sectionTree = { type: 'root', children: children.slice(nodeIndex, end) };
  return { sectionMarkdown: toMarkdown(sectionTree), nodeCount };
}

// patchSections(content: string, sections: Array<{ nodeIndex, nodeCount }>, newSectionMarkdown: string)
// → string
// sections must be sorted ascending by nodeIndex.
// Applies patches right-to-left so earlier indices stay valid:
//   - sections[1..n-1]: splice out (delete those nodes)
//   - sections[0]: replace with nodes parsed from newSectionMarkdown
// Works for n=1 (single rewrite/expand) and n>1 (summarize/merge).
async function patchSections(content, sections, newSectionMarkdown) {
  const { fromMarkdown, toMarkdown } = await getMdastUtils();
  const tree = fromMarkdown(content);
  const newNodes = fromMarkdown(newSectionMarkdown).children;

  // Process right-to-left to preserve index validity
  for (let i = sections.length - 1; i >= 0; i--) {
    const { nodeIndex, nodeCount } = sections[i];
    if (i === 0) {
      // Replace with new content
      tree.children.splice(nodeIndex, nodeCount, ...newNodes);
    } else {
      // Delete
      tree.children.splice(nodeIndex, nodeCount);
    }
  }

  return toMarkdown(tree);
}

module.exports = { indexSections, extractSection, patchSections };
