# PulseHub

PulseHub is a real-time classroom discussion system for teacher-managed discussion spaces. Teachers create discussions, students join by link, and the teacher can monitor group ideas and control the sharing flow during class.

## Project

The active probe lives in [`Class Discussion Probe System`](/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class%20Discussion%20Probe%20System).

## Current App Flow

### Teacher

- register or log in
- open the workspace dashboard
- create a discussion
- manage discussion flow, sharing order, and sharing view

### Student

- join through a discussion link
- enter:
  - `Your name`
  - `Group name`
  - `Group size`
- post cards to the group space

## Current Live Address

- public URL: [http://111.230.243.180](http://111.230.243.180)

## Documents

- Technical and deployment notes: [`TECHNICAL.md`](/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/TECHNICAL.md)

## Notes

- the student-side `group size` is persisted to the backend
- local data is stored in SQLite during the probe stage
