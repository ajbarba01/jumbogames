/** Registers every kit component's intent; feeds COMPONENTS.md and the
 *  completeness test (docs/UI.md). */
import { buttonIntent } from "./actions/Button.intent";
import { copyCodeIntent } from "./actions/CopyCode.intent";
import { brandMarkIntent } from "./brand/BrandMark.intent";
import { cardIntent } from "./surface/Card.intent";
import type { ComponentIntent } from "./lib/intent";
import { spinnerIntent } from "./Spinner.intent";
import { slamWipeIntent } from "./SlamWipe.intent";
import {
  useClickAwayIntent,
  useDismissLayerIntent,
} from "./overlay/layers.intent";
import {
  capsLabelIntent,
  menuCardIntent,
  menuItemIntent,
} from "./overlay/MenuCard.intent";
import { confirmDialogIntent } from "./overlay/ConfirmDialog.intent";
import { modalShellIntent } from "./overlay/ModalShell.intent";
import { popoverCardIntent } from "./overlay/PopoverCard.intent";
import { tooltipIntent } from "./overlay/Tooltip.intent";
import {
  dialogSearchHeadIntent,
  settingRowIntent,
  tocRailIntent,
} from "./frame/SettingsFrame.intent";
import { kbdIntent } from "./keys/Kbd.intent";
import { shortcutsOverlayIntent } from "./keys/ShortcutsOverlay.intent";
import { codeInputIntent } from "./inputs/CodeInput.intent";
import { selectIntent } from "./inputs/Select.intent";
import { stepSliderIntent } from "./inputs/StepSlider.intent";
import { textFieldIntent } from "./inputs/TextField.intent";
import { toggleIntent } from "./inputs/Toggle.intent";
import { zoomIntent } from "./zoom.intent";

/** Every kit member appends its intent here. Feeds COMPONENTS.md + the coverage test. */
export const allIntents: ComponentIntent[] = [
  spinnerIntent,
  slamWipeIntent,
  brandMarkIntent,
  cardIntent,
  useDismissLayerIntent,
  useClickAwayIntent,
  zoomIntent,
  buttonIntent,
  copyCodeIntent,
  menuCardIntent,
  menuItemIntent,
  capsLabelIntent,
  popoverCardIntent,
  tooltipIntent,
  selectIntent,
  toggleIntent,
  textFieldIntent,
  codeInputIntent,
  stepSliderIntent,
  modalShellIntent,
  confirmDialogIntent,
  kbdIntent,
  shortcutsOverlayIntent,
  dialogSearchHeadIntent,
  tocRailIntent,
  settingRowIntent,
];
