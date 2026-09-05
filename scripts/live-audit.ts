import { runAudit } from '../lib/audit';

async function main() {
  const domain = process.argv[2] || 'infrasity.com';
  console.log(`Starting live audit for ${domain}...\n`);

  try {
    const result = await runAudit(domain);

    console.log('# Audit Report: ' + domain);
    console.log(`\n**Score:** ${result.score}/100 (${result.grade})`);
    
    console.log('\n## Score Breakdown');
    console.log(`- Authenticity & Availability: ${result.scoreBreakdown.authenticity} / ${result.scoreBreakdown.authenticityMax}`);
    console.log(`- Structure: ${result.scoreBreakdown.structure} / ${result.scoreBreakdown.structureMax}`);
    console.log(`- Link Resolution & Crawlability: ${result.scoreBreakdown.linkResolution} / ${result.scoreBreakdown.linkResolutionMax}`);
    console.log(`- AI/Link Quality: ${result.scoreBreakdown.linkQuality} / ${result.scoreBreakdown.linkQualityMax}`);

    console.log('\n## File Status');
    console.log(`- /llms.txt: ${result.files.llmsTxt.classification.classification}`);
    console.log(`- /llms-full.txt: ${result.files.llmsFullTxt ? result.files.llmsFullTxt.classification.classification : 'NOT_FOUND'}`);

    console.log('\n## Link Statistics');
    const totalLinks = result.links.length;
    const htmlTargets = result.links.filter(l => l.status === 'HTML_CONTENT').length;
    const markdownTargets = result.links.filter(l => l.status === 'MARKDOWN_CONTENT').length;
    const otherTargets = result.links.filter(l => l.status === 'OTHER_NON_HTML').length;
    const emptyHtml = result.links.filter(l => l.status === 'EMPTY_HTML').length;
    const brokenLinks = result.links.filter(l => l.status === 'BROKEN' || l.status === 'SERVER_ERROR').length;
    
    console.log(`Total Links: ${totalLinks}`);
    console.log(`- HTML Targets (Real Content): ${htmlTargets}`);
    console.log(`- Markdown Targets: ${markdownTargets}`);
    console.log(`- Other Non-HTML Targets: ${otherTargets}`);
    console.log(`- Empty HTML (SPA Shells): ${emptyHtml}`);
    console.log(`- Broken/Server Error: ${brokenLinks}`);

    if (result.fixes.length > 0) {
      console.log('\n## Recommended Fixes');
      result.fixes.forEach((fix, i) => {
        console.log(`\n### ${i + 1}. [${fix.severity.toUpperCase()}] ${fix.title}`);
        console.log(`*Impact: -${fix.pointsImpact} points*`);
        console.log(`**Explanation:** ${fix.explanation}`);
        console.log(`**Recommendation:** ${fix.recommendation}`);
      });
    }

  } catch (error) {
    console.error('Audit failed:', error);
    process.exit(1);
  }
}

main();
