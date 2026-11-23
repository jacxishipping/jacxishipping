import fs from 'fs';
import path from 'path';
import {
  DEFAULT_AUTOMATION_SETTINGS,
  type AutomationSettingsValues,
} from './automation-settings-defaults';

export { DEFAULT_AUTOMATION_SETTINGS, type AutomationSettingsValues };

const CONFIG_FILE_PATH = path.join(process.cwd(), '.automation-config.json');

export function getStoredAutomationSettings(): AutomationSettingsValues {
  let overrides: Partial<AutomationSettingsValues> = {};

  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const content = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object' && parsed !== null) {
        overrides = parsed;
      }
    }
  } catch {
    // If reading fails, ignore and use defaults
  }

  return {
    ...DEFAULT_AUTOMATION_SETTINGS,
    ...overrides,
  };
}

export function saveStoredAutomationSettings(
  updates: Partial<AutomationSettingsValues>
): AutomationSettingsValues {
  const current = getStoredAutomationSettings();
  const next: AutomationSettingsValues = {
    ...current,
    ...updates,
  };

  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(next, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save automation settings to disk:', error);
  }

  return next;
}

