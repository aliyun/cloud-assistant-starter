// https://vt100.net/docs/vt100-ug/chapter3.html
// https://www2.ccs.neu.edu/research/gpc/VonaUtils/vona/terminal/vtansi.htm

export function loadAlternateScreen(): string {
    return "\x1b[?1049h"        // DEC Private
}

export function unloadAlternateScreen(): string {
    return "\x1b[?1049l"        // DEC Private
}

export function saveCursorAndAttrs(): string {
    return "\x1b7"              // DEC Private
}

export function restoreCursorAndAttrs(): string {
    return "\x1b8"              // DEC Private
}

// SaveCursorPosition saves the cursor position.
export function saveCursorPosition(): string {
    return "\x1b[s"
}

// RestoreCursorPosition saves the cursor position.
export function restoreCursorPosition(): string {
    return "\x1b[u"
}

// HideCursor hides the cursor.
export function hideCursor(): string {
    return "\x1b[?25l"
}

// ShowCursor shows the cursor.
export function showCursor(): string {
    return "\x1b[?25h"
}

export function queryCursorPos(): string {
    return "\x1b[6n"
}

export function reportCursorPos(row: number, col: number): string {
    return "\x1b[" + row + ";" + col + "R"
}

export function cursorUp(rows: number = 1): string {
    return "\x1b[" + rows + "A"
}

export function cursorDown(rows: number = 1): string {
    return "\x1b[" + rows + "B"
}

export function cursorForward(cols: number = 1): string {
    return "\x1b[" + cols + "C"
}

export function cursorBackward(cols: number = 1): string {
    return "\x1b[" + cols + "D"
}

export function cursorNextLine(lines: number = 1): string {
    return "\x1b[" + lines + "E"
}

export function cursorPreviousLine(lines: number = 1): string {
    return "\x1b[" + lines + "F"
}

export function cursorToColumn(cols: number): string {
    return "\x1b[" + cols + "G"
}

export function cursorHead(): string {
    return "\x1b[G"
}

export function cursorHome(): string {
    return "\x1b[H"
}

export function cursorPosPattern(): RegExp {
    return /\x1b\[(\d+);(\d+)H/
}

export function cursorPos(y: number, x: number): string {
    return "\x1b[" + y + ";" + x + "H" // or \e [ Pn ; Pn f
}

export function clearScreenAfterCursor(): string {
    return "\x1b[0J" // == \e[J
}

export function clearScreenBeforeCursor(): string {
    return "\x1b[1J"
}

export function clearScreen(): string {
    return "\x1b[2J"
}

export function restartLine(): string {
    return clearScreenAfterCursor() + cursorHead();
}

export function clearLineAfterCursor(): string {
    return "\x1b[0K"  // == \e[K
}

export function clearLineBeforeCursor(): string {
    return "\x1b[1K"
}

export function clearFullLine(): string {
    return "\x1b[2K"
}

export function resetLine(): string {
    return "\x1b[2K\x1b[G"
}

export function deleteChar(pn: number = 1): string {
    return "\x1b[" + pn + "P"
}

export function deleteLine(pn: number = 1): string {
    return "\x1b[" + pn + "M"
}

export function eraseChar(pn: number = 1): string {
    return "\x1b[" + pn + "X"
}

export function scrollDownLine(): string {
    return "\x1b[D"
}

export function scrollUpLine(): string {
    return "\x1b[M"
}

export function scrollUp(lines?: number): string {
    return "\x1b[" + (lines ?? "") + "S"
}

export function scrollDown(lines?: number): string {
    return "\x1b[" + (lines ?? "") + "T"
}

export function scrollScreen(): string {
    return "\x1b[r"
}

/**
 *
 * @param pt - number of the top line of the scrolling region
 * @param pb - number of the  bottom line of the scrolling region
 */
export function scrollRegion(pt: number, pb: number): string {
    return "\x1b[" + pt + ";" + pb + "r"    // DEC Private
}

/**
 *
 * @param ps
 * 0    Reset all attributes
 * 1    Bright
 * 2    Dim
 * 4    Underscore
 * 5    Blink
 * 7    Reverse
 * 8    Hidden
 * Foreground Colours
 * 30    Black
 * 31    Red
 * 32    Green
 * 33    Yellow
 * 34    Blue
 * 35    Magenta
 * 36    Cyan
 * 37    White
 * Background Colours
 * 40    Black
 * 41    Red
 * 42    Green
 * 43    Yellow
 * 44    Blue
 * 45    Magenta
 * 46    Cyan
 * 47    White
 *
 */
export function color(ps: number[]): string {
    return "\x1b[" + ps.join(";") + "m"
}

export function reset(): string {
    return "\x1b[m"
}

export function style(text: string, ...ps: number[]): string {
    return color(ps) + text + reset()
}

