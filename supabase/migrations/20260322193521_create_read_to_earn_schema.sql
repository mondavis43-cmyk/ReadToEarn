/*
  # Create Read-to-Earn Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, not null)
      - `available_balance` (decimal, default 0.00)
      - `created_at` (timestamptz)
    
    - `books`
      - `id` (serial, primary key)
      - `title` (text, not null)
      - `author` (text, not null)
      - `cover_image_url` (text)
      - `bounty_amount` (decimal, not null)
    
    - `questions`
      - `id` (serial, primary key)
      - `book_id` (integer, foreign key)
      - `question_text` (text, not null)
      - `option_a` (text, not null)
      - `option_b` (text, not null)
      - `option_c` (text, not null)
      - `option_d` (text, not null)
      - `correct_answer` (text, not null) -- stores "A", "B", "C", or "D"
    
    - `quiz_attempts`
      - `id` (serial, primary key)
      - `user_id` (uuid, foreign key)
      - `book_id` (integer, foreign key)
      - `score` (integer, not null)
      - `passed` (boolean, not null)
      - `created_at` (timestamptz)
    
    - `completed_books`
      - `id` (serial, primary key)
      - `user_id` (uuid, foreign key)
      - `book_id` (integer, foreign key)
      - `created_at` (timestamptz)
      - Unique constraint on (user_id, book_id)
    
    - `cashout_requests`
      - `id` (serial, primary key)
      - `user_id` (uuid, foreign key)
      - `amount` (decimal, not null)
      - `status` (text, default "pending")
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Users can only read/write their own profile
    - Users can only read books and questions (public)
    - Users can only read/write their own quiz attempts and completed books
    - Users can only read/write their own cashout requests
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  available_balance decimal(10,2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id serial PRIMARY KEY,
  title text NOT NULL,
  author text NOT NULL,
  cover_image_url text,
  bounty_amount decimal(10,2) NOT NULL
);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view books"
  ON books FOR SELECT
  TO authenticated
  USING (true);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id serial PRIMARY KEY,
  book_id integer NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer text NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D'))
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

-- Create quiz_attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id integer NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  score integer NOT NULL,
  passed boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attempts"
  ON quiz_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts"
  ON quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create completed_books table
CREATE TABLE IF NOT EXISTS completed_books (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id integer NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, book_id)
);

ALTER TABLE completed_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completed books"
  ON completed_books FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completed books"
  ON completed_books FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create cashout_requests table
CREATE TABLE IF NOT EXISTS cashout_requests (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cashout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cashout requests"
  ON cashout_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cashout requests"
  ON cashout_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);