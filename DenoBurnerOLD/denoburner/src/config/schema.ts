/**
 * JSON Schema for denoburner configuration
 * 
 * Provides IDE autocompletion and validation for config files.
 */

/**
 * JSON Schema for denoburner configuration
 */
export const configSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://denoburner.dev/schema.json",
  "title": "Denoburner Configuration",
  "description": "Configuration for denoburner - Bitburner development tool for Deno",
  "type": "object",
  "properties": {
    "$schema": {
      "type": "string",
      "description": "JSON Schema reference"
    },
    "extends": {
      "oneOf": [
        {
          "type": "string",
          "description": "Path to base config file"
        },
        {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Paths to base config files (later overrides earlier)"
        }
      ],
      "description": "Extend from base config file(s)"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+",
      "description": "Config schema version for migration"
    },
    "port": {
      "type": "integer",
      "minimum": 1,
      "maximum": 65535,
      "default": 12525,
      "description": "Port for Bitburner Remote API connection"
    },
    "timeout": {
      "type": "integer",
      "minimum": 0,
      "default": 10000,
      "description": "Connection timeout in milliseconds"
    },
    "sourceMap": {
      "type": "boolean",
      "default": false,
      "description": "Generate source maps"
    },
    "minify": {
      "type": "boolean",
      "default": false,
      "description": "Minify output"
    },
    "outDir": {
      "type": "string",
      "default": "dist",
      "description": "Output directory for build command"
    },
    "ignoreInitial": {
      "type": "boolean",
      "default": false,
      "description": "Skip initial upload on dev server start"
    },
    "watch": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/WatchItem"
      },
      "description": "Watch patterns configuration"
    },
    "theme": {
      "$ref": "#/definitions/ThemeConfig",
      "description": "TUI theme configuration"
    },
    "download": {
      "$ref": "#/definitions/DownloadConfig",
      "description": "Download configuration"
    },
    "plugins": {
      "type": "object",
      "additionalProperties": true,
      "description": "Plugin-specific configuration"
    }
  },
  "required": ["watch"],
  "additionalProperties": false,
  "definitions": {
    "WatchItem": {
      "type": "object",
      "properties": {
        "pattern": {
          "type": "string",
          "description": "Glob pattern to match files"
        },
        "transform": {
          "type": "boolean",
          "default": false,
          "description": "Enable file processing (transform TS, bundle deps)"
        },
        "bundle": {
          "oneOf": [
            {
              "type": "string",
              "enum": ["external", "all"]
            },
            {
              "type": "boolean",
              "const": false
            }
          ],
          "default": "external",
          "description": "Bundling mode: 'external' (only external deps), 'all' (everything), or false (no bundling)"
        },
        "transpile": {
          "type": "boolean",
          "default": true,
          "description": "Transpile TypeScript to JavaScript when bundling"
        },
        "location": {
          "oneOf": [
            {
              "type": "string",
              "description": "Destination server name"
            },
            {
              "type": "object",
              "properties": {
                "filename": {
                  "type": "string",
                  "description": "Destination filename"
                },
                "server": {
                  "type": "string",
                  "description": "Destination server"
                }
              }
            },
            {
              "type": "array",
              "items": {
                "oneOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "object",
                    "properties": {
                      "filename": {
                        "type": "string"
                      },
                      "server": {
                        "type": "string"
                      }
                    }
                  }
                ]
              }
            }
          ],
          "description": "Destination for the transformed files"
        }
      },
      "required": ["pattern"],
      "additionalProperties": false
    },
    "ThemeConfig": {
      "type": "object",
      "properties": {
        "border": {
          "type": "string",
          "description": "Panel border color"
        },
        "prefix": {
          "type": "string",
          "description": "Log prefix color"
        },
        "success": {
          "type": "string",
          "description": "Success message color"
        },
        "error": {
          "type": "string",
          "description": "Error message color"
        },
        "warning": {
          "type": "string",
          "description": "Warning message color"
        },
        "info": {
          "type": "string",
          "description": "Info message color"
        },
        "change": {
          "type": "string",
          "description": "Change indicator color"
        },
        "ramLow": {
          "type": "string",
          "description": "Low RAM usage color (<2GB)"
        },
        "ramMedium": {
          "type": "string",
          "description": "Medium RAM usage color (2-4GB)"
        },
        "ramHigh": {
          "type": "string",
          "description": "High RAM usage color (>4GB)"
        },
        "connected": {
          "type": "string",
          "description": "Connected status color"
        },
        "disconnected": {
          "type": "string",
          "description": "Disconnected status color"
        }
      },
      "additionalProperties": false
    },
    "DownloadConfig": {
      "type": "object",
      "properties": {
        "servers": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Servers to download from"
        },
        "ignoreTs": {
          "type": "boolean",
          "default": true,
          "description": "Skip .ts files"
        },
        "ignoreSourcemap": {
          "type": "boolean",
          "default": true,
          "description": "Skip .map files"
        }
      },
      "additionalProperties": false
    }
  }
};

/**
 * Get the JSON schema URL for denoburner config
 */
export function getSchemaUrl(): string {
  return "https://denoburner.dev/schema.json";
}

/**
 * Get the $schema property to add to config files
 */
export function getSchemaProperty(): string {
  return `$schema: ${getSchemaUrl()}`;
}

/**
 * Generate a sample config file with schema reference
 */
export function generateSampleConfig(): string {
  return `import { defineConfig } from "@scope/denoburner";

export default defineConfig({
  // $schema: ${getSchemaUrl()}
  
  port: 12525,
  sourceMap: false,
  
  watch: [
    {
      pattern: "src/servers/**/*.{ts,tsx}",
      transform: true,
      bundle: "external",
    },
    {
      pattern: "src/servers/**/*.{script,txt}",
      transform: false,
    },
  ],
});
`;
}
