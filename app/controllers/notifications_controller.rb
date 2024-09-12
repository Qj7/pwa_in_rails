class NotificationsController < ApplicationController
  def create
    subscription_params = params.require(:subscription).permit(:endpoint, :expirationTime, keys: [:p256dh, :auth])

    # Формируем JSON-сообщение
    message = {
      title: "Hello",
      message: "от Thinknetica",
      icon: "/icon_192.png"
    }.to_json

    Webpush.payload_send(
      message: message,
      endpoint: subscription_params[:endpoint],
      p256dh: subscription_params.dig(:keys, :p256dh),
      auth: subscription_params.dig(:keys, :auth),
      vapid: {
        public_key: ENV['VAPID_PUBLIC_KEY'],
        private_key: ENV['VAPID_PRIVATE_KEY']
      }
    )

    render json: { success: true }
  rescue Webpush::InvalidSubscription => e
    render json: { success: false, error: e.message }, status: :unprocessable_entity
  end
end