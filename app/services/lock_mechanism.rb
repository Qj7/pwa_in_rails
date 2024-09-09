require 'set'

class LockMechanism
  attr_reader :initial_combination, :target_combination

  def initialize(args)
    @initial_combination = args[:from]
    @target_combination = args[:to]
  end

  def calculate_unlock_sequence
    raise 'Initial and target combinations must be set' if @initial_combination.nil? || @target_combination.nil?
    raise 'Initial and target combinations cannot be empty' if @initial_combination.empty? || @target_combination.empty?
    raise 'Initial and target combinations must have the same size' if @initial_combination.size != @target_combination.size

    p bfs
  end

  private

  def bfs
    queue = []
    visited = Set.new

    queue << [@initial_combination.dup]
    visited.add(@initial_combination.dup)

    until queue.empty?
      path = queue.shift
      current_combination = path.last

      return path if current_combination == @target_combination

      next_combinations(current_combination).each do |next_comb|
        next_comb_dup = next_comb.dup
        unless visited.include?(next_comb_dup)
          visited.add(next_comb_dup)
          queue << (path + [next_comb_dup])
        end
      end
    end

    raise 'No solution found for the given parameters'
  end

  def next_combinations(combination)
    combinations = []

    combination.each_with_index do |digit, i|
      up = combination.dup
      down = combination.dup

      up[i] = (digit + 1) % 10
      down[i] = (digit - 1 + 10) % 10

      combinations << up
      combinations << down
    end

    combinations
  end
end