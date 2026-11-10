Parks & More assets for the user's personal TV.

Six backgrounds are cleaned edits of the screenshots the user supplied: EPCOT, Hollywood Studios, Animal Kingdom, Magic Kingdom, Disney Springs, and the blank wait-list landscape. Recorded text/numbers were removed for live native overlays.

Music now uses the three full MP3 loops in [playlist/playlist.json](playlist/playlist.json): EPCOT entrance (2021), Magic Kingdom entrance (2020), and classic EPCOT Innoventions. The queue repeats after the third recording and saves its current track, playback position and mute preference. Park screen rotation does not change or restart the music. The previous WDW Today soundtrack remains as a recovery fallback. Returning to a resort restores that resort's separate music.

Data: ThemeParks.wiki live/schedule REST for the four parks; Disney Springs public website content/hours endpoint for today; Open-Meteo current conditions for the selected resort, shared with its welcome screen; America/New_York clock. Media retain their respective ownership.

Showtime text is white. Elapsed performance starts disappear automatically, including while rotation is paused. Today's completed shows remain visible with “No more shows for today”; a performance with a supplied end time shows “Show in progress” until it ends. Missing end times are not guessed.

Animated backgrounds: see [loops/README.md](loops/README.md) for seven processed silent clips and source attribution. Six clips are active in the native Parks display; waterparks is retained as a reusable asset. Live data and the original separate music track remain native overlays. No crossfade is used.

Closed parks show “No Active Wait Times” and “All listed attractions are currently unavailable.” Closed/open checks use actual schedule intervals, including overnight hours.

Scheduled Happily Ever After playback is enabled only while Saratoga or Parks is in the foreground. A fresh posted show start plus open-park hours triggers the user-selected recording once. The video is cached in the native installation for reliable completion; the full recording is not uploaded to this public asset repository. It returns to Saratoga when the recording actually ends. See fireworks.json.
