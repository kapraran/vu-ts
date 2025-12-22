/**
 * Simple template rendering utility
 * Supports:
 * - Variable replacement: {{variableName}}
 * - Conditional blocks: {{#if condition}}...{{/if}}
 * - Each loops: {{#each array}}...{{/each}}
 */

export interface TemplateContext {
  [key: string]: any;
}

/**
 * Render a template string with the given context
 */
export function renderTemplate(
  template: string,
  context: TemplateContext
): string {
  let result = template;

  // Handle {{#each array}}...{{/each}} blocks
  result = result.replace(
    /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (match, arrayName, block) => {
      const array = context[arrayName];
      if (!Array.isArray(array)) {
        return "";
      }
      return array
        .map((item, index) => {
          // Create a context for each iteration
          const itemContext = {
            ...context,
            this: item,
            "@index": index,
            "@first": index === 0,
            "@last": index === array.length - 1,
          };
          return renderTemplate(block, itemContext);
        })
        .join("");
    }
  );

  // Handle {{#if condition}}...{{/if}} blocks
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (match, conditionName, block) => {
      const condition = context[conditionName];
      if (condition) {
        return renderTemplate(block, context);
      }
      return "";
    }
  );

  // Handle variable replacement: {{variableName}} or {{variableName.property}} or {{this}}
  result = result.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, varPath) => {
    // Handle special "this" variable
    if (varPath === "this") {
      return context.this !== undefined && context.this !== null
        ? String(context.this)
        : "";
    }
    
    const parts = varPath.split(".");
    let value = context;
    for (const part of parts) {
      if (value === undefined || value === null) {
        return "";
      }
      value = value[part];
    }
    return value !== undefined && value !== null ? String(value) : "";
  });

  return result;
}

/**
 * Load a template file and render it with the given context
 */
export async function loadAndRenderTemplate(
  templatePath: string,
  context: TemplateContext
): Promise<string> {
  const template = await Bun.file(templatePath).text();
  return renderTemplate(template, context);
}

