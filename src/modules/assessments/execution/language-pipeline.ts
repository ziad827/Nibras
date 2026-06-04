export type SupportedLanguage = 'cpp' | 'python' | 'java' | 'javascript' | 'go';

export interface LanguagePipelineConfig {
  image: string;
  compileCmd?: string[];
  runCmd: string[];
  sourceFile: string;
  workDir: string;
}

const PIPELINES: Record<SupportedLanguage, LanguagePipelineConfig> = {
  cpp: {
    image: 'gcc:12',
    compileCmd: ['g++', '-std=c++17', '-O2', '-o', 'main', 'main.cpp'],
    runCmd: ['./main'],
    sourceFile: 'main.cpp',
    workDir: '/sandbox',
  },
  python: {
    image: 'python:3.11-slim',
    runCmd: ['python3', 'main.py'],
    sourceFile: 'main.py',
    workDir: '/sandbox',
  },
  java: {
    image: 'eclipse-temurin:17-jdk',
    compileCmd: ['javac', 'Main.java'],
    runCmd: ['java', 'Main'],
    sourceFile: 'Main.java',
    workDir: '/sandbox',
  },
  javascript: {
    image: 'node:20-alpine',
    runCmd: ['node', 'main.js'],
    sourceFile: 'main.js',
    workDir: '/sandbox',
  },
  go: {
    image: 'golang:1.21-alpine',
    compileCmd: ['go', 'build', '-o', 'main', 'main.go'],
    runCmd: ['./main'],
    sourceFile: 'main.go',
    workDir: '/sandbox',
  },
};

export function resolveLanguage(language: string): SupportedLanguage | null {
  const normalized = language.toLowerCase().trim();
  const aliases: Record<string, SupportedLanguage> = {
    cpp: 'cpp',
    'c++': 'cpp',
    cxx: 'cpp',
    python: 'python',
    py: 'python',
    python3: 'python',
    java: 'java',
    javascript: 'javascript',
    js: 'javascript',
    node: 'javascript',
    go: 'go',
    golang: 'go',
  };
  return aliases[normalized] ?? null;
}

export function getPipeline(
  language: SupportedLanguage,
): LanguagePipelineConfig {
  return PIPELINES[language];
}

export function wrapCodeForLanguage(
  language: SupportedLanguage,
  code: string,
): string {
  if (language === 'javascript') {
    if (code.includes('function solve')) return code;
    return `${code}\nmodule.exports = { solve };`;
  }
  if (language === 'python') {
    if (code.includes('def solve')) return code;
    return `${code}\n`;
  }
  if (language === 'java') {
    if (code.includes('class Main')) return code;
    return `public class Main {\n  public static void main(String[] args) {\n    ${code}\n  }\n}`;
  }
  return code;
}
