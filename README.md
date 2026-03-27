# OriginTab

[简体中文](README-ZH.md)

## Introduction

If you want a simple and straightforward way to save your browser tabs and restore them when needed in the future, then OriginTab is designed for you.

This is a Vibe coding product of mine, designed to replicate the original [OneTab](https://www.one-tab.com/), but stripped of all complex features. OriginTab focuses solely on saving and restoring, without any other complicated concepts.

While you can create multiple groups within OriginTab, this isn't necessary, as all groups will create subgroups based on their save time. After OriginTab is installed, it creates a default group that you can use directly.

OriginTab settings are synced across browsers, but tabs are only saved locally. You can import and export them at any time.

## Why create this, instead of using OneTab

I've been a OneTab user for a long time, and I use it to temporarily save tabs like these:

- Some I don't have time to check now, but I'll look at them in a few days.
- I have too many tabs open at the moment, but I'll be using some of them, so I'll temporarily put them all in OneTab to improve browser speed.

That's all. I don't have any complicated needs. I thought the previous version of OneTab met my needs perfectly; its interface was simple and its functions were straightforward. But the recent redesign completely overturned it.

OneTab is now filled with inexplicable features: archives? recycle bin? subfolders? I don't think many people will use these; at least I've never used them, and I've never created any folders. I've always used the default folder.

What I wanted was an extremely simple tool that could still save temporary tabs, but OneTab isn't that anymore.

That's why I created it.

## Some default settings

- OriginTab allows duplicate tabs (most of the time, you don't care about duplicates).
- OriginTab doesn't save fixed tabs (it assumes they are permanent).
- When restoring tab groups, OriginTab freezes them to reduce memory usage.

## Development

Please refer to the [AGENT.md](AGENT.md) for development details.

## License

MIT License
