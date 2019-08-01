Introduction
------------
The H2 geometry is based on projecting the earth sphere onto a cube.
Based on Google S2, it differs in the fact that :

- it's a javascript native library and uses BigInt class to get safe and fast bit manipulation
- also it requires no compilation
- fits in a 64 bits signed integer by using only the 62 least significant bits. make it easy to store in a database that doesn't support 64 unsigned integers.
- max level is 29 while Google S2 was 30. more than enough for most applications.

It has some geo(metric|graphic) properties :

- can define a point or a region of any hierarchical level in the form of a quadtree
- the difference between two H2 ids give an idea of the distance between the two points. Useful to find nearest points in a database.
- it is possible to check for inclusion by using .min and .max
