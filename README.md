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

# Screen 3: Vocabulary

We should have a page where I can edit the commands in the web app’s vocabulary and the sequences they play.

# Linguistic Theory

Instead of playing words, commands are sequences

- Mediums: tssing, whistling, beeps, growling (human), physical touches
- “.” is short, “_” is long, “0“ is silence
- Channels:
    - Owner: Neutral - tss-ing, Urgent - whistling
    - Dog: Neutral - growling/touching with nose, urgent - barking

| **L1 Prefix** | **L2 Prefix** | **Word** | **Sequence** |
| --- | --- | --- | --- |
| . | .. | Yes/Good/Mark | .. |
| . | .. | No/Bad/Mark | ... |
| . | .0 | I don't understand/What? | .0. |
| _ | __ | Max | __. |
| . | ._ | Pythagoras | ._.. |
| . | .. | Now | ..0.. |
| . | .. | Later | ..0... |
| _ | _ | Driving (listen to me) | _ |
| _ | __ | Release/play (free) | __.. |
| _ | _. | Place/stay | _. |
| _ | _. | Sit | _.0. |
| _ | _. | Down | _.0_ |
| _ | __ | Move/go | __ |
| _ | __ | Come to me (Max) | __. |
| _ | __ | Heel | __._ |
| _ | __ | Leave it | __... |
| _ | _0 | Touch | _0. |
| _ | _0 | Bark | _0_ |
| _ | _0 | Growl | _0_0_ |
| . | ._ | Outside | ._ |
| . | ._ | Park | ._. |
| . | ._ | Pee | .__ |
| . | ._ | Poop | .__. |
| . | .0 | Inside/Home | .0_ |
| . | .0 | Crate | .0__ |
| . | .. | Food | .._ |
| . | .. | Water | .._. |
