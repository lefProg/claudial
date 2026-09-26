import React from 'react';
import { render } from 'ink';
import { Picker, type PickerResult } from './Picker.js';

/** Open the picker full-screen and resolve when it closes (esc saves, ctrl+c cancels). */
export async function runPicker(intro?: string): Promise<PickerResult | null> {
  let result: PickerResult | null = null;
  const app = render(
    React.createElement(Picker, {
      intro,
      onDone: (r: PickerResult) => { result = r; app.unmount(); },
    }),
  );
  await app.waitUntilExit();
  return result;
}
