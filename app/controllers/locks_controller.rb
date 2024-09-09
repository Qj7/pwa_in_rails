class LocksController < ApplicationController
  def open_lock
    service = LockMechanism.new(lock_params)

    if lock_params[:from].size != lock_params[:to].size
      return render json: { error: 'Initial and target combinations must have the same size' }, status: :unprocessable_entity
    end

    @solution = service.calculate_unlock_sequence

    respond_to do |format|
      format.json { render json: { solution: @solution } }
    end
  end

  private

  def lock_params
    params.require(:lock).permit(from: [], to: [])
  end
end
