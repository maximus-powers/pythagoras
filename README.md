# Dog Training Web App

# Screen 1: Command Board

Screen with a bunch of buttons that trigger commands:

- Command buttons
- Red + Green buttons for random marking
- Config Options:
    - Mute (for vocal training)
    - Medium: tssing, whistling, beeps, growling (human), physical touches

# Screen 2: Marking

Buttons:

- Red: Didn’t Listen
    - Plays negative mark
    - Store record:
        - Call ID
        - Command
        - Didn’t listen
    - Don’t change screen, might listen soon
- Green: Listened
    - Plays positive mark noise
    - Store record:
        - Call ID
        - Command
        - Duration: time from command to time green mark
    - Go back to command screen after
- Repeat command
- Exit (back to main screen)

# Screen 3: Analytics

I want a dashboard for analysis of various splits of the data we collect on his training responsiveness.

A few potential charts we could do are:

- Command-wise mastery bar chart: show responsiveness stacked bars for each command we have data on. It could be averaged number of negative vs positive marks before success.

# Screen 4: Vocabulary

We should have a page where I can edit the commands in the web app’s vocabulary and the sequences they play.

# Linguistic Theory

Instead of playing words, commands are sequences

- Mediums: tssing, whistling, beeps, growling (human), physical touches
- “.” is short, “_” is long, “0“ is silence
- Channels:
    - Owner: Neutral - tss-ing, Urgent - whistling
    - Dog: Neutral - growling/touching with nose, urgent - barking

| **Parent Family** | **Family** | **Word** | **Sequence** |
| --- | --- | --- | --- |
| Positive “..” | N/A  | Yes/Good/Mark | “..” |
| Negative “…” | N/A | No/Bad/Mark | “…” |
| Question “.0.” | N/A | I don’t understand/What? | “.0.” |
| Max (owner) “__.” | N/A | Max | “__.” |
| Pythagoras (the dog) “.__” | N/A | Pythagoras | “.__.” |
| Temporal “..0” | N/A | Now | “..0..” |
| Temporal “..0” | N/A | Later | “..0…” |
| Command “_” | N/A | Driving (listen to me) | “_” |
| Command “_” | N/A | Release/play (free) | “__..” |
| Command “_” | Stationary “_.” | Place/stay | “_.” |
| Command “_” | Stationary “_.” | Sit | “_.0.” |
| Command “_” | Stationary “_.” | Down | “_.0_” |
| Command “_” | Movement “—” | Move/go | “__” |
| Command “_” | Movement “—” | Come to me (Max) | “__.” |
| Command “_” | Movement “—” | Heel | “__._” |
| Command “_” | Movement “—” | Leave it | __… |
| Command “_” | Communication “_0” | Touch | “_0.” |
| Command “_” | Communication “_0” | Bark | “_0_” |
| Command “_” | Communication “_0” | Growl | “_0_0_” |
| Nouns “.” | Outside “._” | Outside | “._” |
| Nouns “.” | Outside “._” | Park | “._.” |
| Nouns “.” | Outside “._” | Pee | “.__” |
| Nouns “.” | Outside “._” | Poop | “.__.” |
| Nouns “." | Inside “.0_” | Inside/Home | “.0_” |
| Nouns “." | Inside “.0_” | Crate | “.0__” |
| Nouns “.” | Sustenance “..” | Food | “.._” |
| Nouns “.” | Sustenance “..” | Water | “.._.” |