# HanziLookupJS (vendored)

Handwriting recognition for `<HanziPad>` (spec 08). Copied unmodified from
[gugray/HanziLookupJS](https://github.com/gugray/HanziLookupJS), commit `b21124f771ddd91f131e62aa478bc188f6ec78d3`
(`dist/hanzilookup.min.js`, `dist/mmah.json`).

These files are a separate work under their own licenses, not under this repository's terms:

- `hanzilookup.min.js`: GNU GPL v3 (`LICENSE`), derived from Jordan Kiang's HanziLookup.
- `mmah.json`: Arphic Public License (`LICENSE-APL`), derived from Make Me a Hanzi's `graphics.txt`.

The app never imports or bundles them: `src/components/handwriting/hanziLookup.ts` loads the script with a
`<script>` tag on first use and the data with `HanziLookup.init`. To update, replace both files from a newer commit
and change the commit above.
