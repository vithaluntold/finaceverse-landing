// ============================================
// ACCUTE ORCHESTRATOR - Expression Evaluator
// Evaluate dynamic expressions in workflows
// ============================================

import { ExecutionContext } from '../types/workflow';

export class ExpressionEvaluator {
  /**
   * Evaluate an expression in context
   */
  async evaluate(expression: string, context: ExecutionContext): Promise<unknown> {
    // Replace variable references
    let expr = expression;
    
    // Replace $variables.xxx
    expr = expr.replace(/\$variables\.(\w+)/g, (_, name) => {
      const value = context.variables[name];
      return typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
    });

    // Replace $nodes.xxx.output
    expr = expr.replace(/\$nodes\.(\w+)\.(\w+)/g, (_, nodeId, prop) => {
      const output = context.nodeOutputs.get(nodeId);
      if (output && typeof output === 'object') {
        const value = (output as Record<string, unknown>)[prop];
        return typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
      }
      return 'null';
    });

    // Replace $env.xxx
    expr = expr.replace(/\$env\.(\w+)/g, (_, name) => {
      return `"${process.env[name] || ''}"`;
    });

    // Evaluate
    try {
      const fn = new Function(`return ${expr}`);
      return fn();
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${expression} - ${error}`);
    }
  }

  /**
   * Parse template string with placeholders
   */
  parseTemplate(template: string, context: ExecutionContext): string {
    return template.replace(/\{\{(.+?)\}\}/g, (_, expr) => {
      try {
        const result = this.evaluate(expr.trim(), context);
        return String(result);
      } catch {
        return `{{${expr}}}`;
      }
    });
  }

  /**
   * Validate expression syntax
   */
  validate(expression: string): { valid: boolean; error?: string } {
    try {
      // Replace variables with dummy values for syntax check
      let testExpr = expression
        .replace(/\$variables\.\w+/g, '"test"')
        .replace(/\$nodes\.\w+\.\w+/g, '"test"')
        .replace(/\$env\.\w+/g, '"test"');
      
      new Function(`return ${testExpr}`);
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Invalid expression' 
      };
    }
  }
}
