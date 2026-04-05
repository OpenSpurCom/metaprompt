What gets stored

chats[n].content is a plain markdown string. Nothing is pre-parsed — the AST is built on demand from that string every time a section utility is called.

The tree structure

fromMarkdown(content) produces an MDAST root node with a flat children[] array of top-level nodes. For example, a message like:


## Overview
Paris is the capital...

## Population
About 2.1 million...
...becomes:


children[0]  heading  depth=2  "Overview"
children[1]  paragraph          "Paris is the capital..."
children[2]  heading  depth=2  "Population"
children[3]  paragraph          "About 2.1 million..."
The tree is flat — there's no nesting of sections. Headings and their body content are siblings, not parent/children.

sectionIdx vs nodeIndex

nodeIndex — position in tree.children. Every node counts (headings, paragraphs, lists, etc.)
sectionIdx — counts only headings. sectionIdx: 0 is the first heading regardless of where it sits in children.
userHighlight stores sectionIdx. The pipeline converts that to nodeIndex via indexSections before any patching.

Section boundaries

A "section" is a heading at nodeIndex plus all following nodes until the next heading with depth <= the current heading's depth. That's the standard outline rule: an ## H2 section ends when you hit another ## or an #. An ### H3 ends at the next ##, ###, or #.

nodeCount is how many children[] entries the section spans — needed to know what to splice out.

Patching (right-to-left)

When merging N sections, patchSections sorts them ascending by nodeIndex then iterates right-to-left:

Deletes sections [1..n-1] first (the higher-index ones), so earlier indices aren't shifted
Replaces section [0] (lowest index) with the new content
This is why index order matters: if you deleted section [0] first, nodeIndex of section [1] would be wrong.

What the data side does NOT store

There are no section IDs persisted in chats. The sectionIdx in userHighlight is the UI's claim about "which heading the user highlighted." It's resolved at operation time by re-parsing the message — so if the message content changes (e.g. after a rewrite), the old sectionIdx reference is stale and the UI should clear userHighlight.