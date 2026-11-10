import accountTree from "@material-symbols/svg-400/outlined/account_tree.svg"
import add from "@material-symbols/svg-400/outlined/add.svg"
import arrowUpward from "@material-symbols/svg-400/outlined/arrow_upward.svg"
import article from "@material-symbols/svg-400/outlined/article.svg"
import chevronLeft from "@material-symbols/svg-400/outlined/chevron_left.svg"
import chevronRight from "@material-symbols/svg-400/outlined/chevron_right.svg"
import close from "@material-symbols/svg-400/outlined/close.svg"
import comment from "@material-symbols/svg-400/outlined/comment.svg"
import fitScreen from "@material-symbols/svg-400/outlined/fit_screen.svg"
import refresh from "@material-symbols/svg-400/outlined/refresh.svg"
import remove from "@material-symbols/svg-400/outlined/remove.svg"
import reply from "@material-symbols/svg-400/outlined/reply.svg"
import { pathOf } from "./icon-path.ts"

const paths = {
  accountTree: pathOf(accountTree),
  add: pathOf(add),
  arrowUpward: pathOf(arrowUpward),
  article: pathOf(article),
  chevronLeft: pathOf(chevronLeft),
  chevronRight: pathOf(chevronRight),
  close: pathOf(close),
  comment: pathOf(comment),
  fitScreen: pathOf(fitScreen),
  refresh: pathOf(refresh),
  remove: pathOf(remove),
  reply: pathOf(reply),
}

export type IconName = keyof typeof paths

/** Material Symbols (outlined). Decorative: the button around it carries the accessible name. */
export const Icon = ({ name, size = 20 }: { name: IconName; size?: number }) => (
  <svg class="icon" viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d={paths[name]} />
  </svg>
)
