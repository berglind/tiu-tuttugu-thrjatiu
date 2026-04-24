# Tíu, tuttugu, þrjátíu (Icelandic Solitaire)

A clean, modern web implementation of the classic Icelandic Solitaire card game "Tíu, tuttugu, þrjátíu" (Ten, Twenty, Thirty). Built with React and Tailwind CSS.

## 🎯 Objective
The goal of the game is to completely clear all columns on the board by finding trios of cards that add up to 10, 20, or 30.

## 🃏 Card Values
* **Aces:** 1
* **Number Cards (2-10):** Face value
* **Face Cards (J, Q, K):** 10

## 📖 How to Play

**1. The Setup**
The game starts with 7 columns, each dealt 2 cards face-up. One column is always highlighted with a yellow border—this is your **Active Column**.

**2. Dealing Cards**
Click the **Deal** button (or click the deck) to deal one card into the Active Column. 
* If you make a successful match and remove cards, the Active Column stays where it is.
* If you deal a card without making a match, the Active Column automatically advances to the next column on the right for the next deal.

**3. Making a Match**
You can only remove cards from the **Active Column**. You must select exactly **3 cards** whose combined value equals exactly **10, 20, or 30**.

**4. Valid Card Positions**
You cannot pick just any three cards in the column! The trio must be in one of these specific positional patterns:
* The **first three** cards in the column.
* The **first two** cards AND the **last** card in the column.
* The **first** card AND the **last two** cards in the column.
* The **last three** cards

*(Note: To keep the game board tidy, long columns will visually "collapse" the middle cards. Don't worry—the cards you need to make valid matches will always remain visible at the top and bottom of the stack!)*

**5. Winning the Game**
When a column is completely emptied, it disappears. You win the game when you have successfully cleared all 7 columns!

## 💻 Tech Stack
* React
* Tailwind CSS
* Vite

## ⚖️ License
Copyright 2026. All rights reserved. 

This source code is provided for personal, non-commercial use and educational purposes only. You may not use, distribute, or modify this code for any commercial purpose without explicit written permission.
