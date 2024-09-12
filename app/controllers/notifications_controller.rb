# class NotificationsController < ApplicationController
#   protect_from_forgery except: :save_subscription

#   def save_subscription
#     subscription = params[:subscription]

#     # Сохранение подписки в базе данных
#     # Например:
#     # Subscription.create!(endpoint: subscription[:endpoint], p256dh: subscription[:keys][:p256dh], auth: subscription[:keys][:auth])

#     render json: { message: 'Subscription saved.' }, status: :ok
#   end

#   def send_notification
#     Webpush.payload_send(
#       message: params[:message] || "Это тестовое сообщение",
#       endpoint: params[:endpoint],
#       p256dh: params[:p256dh],
#       auth: params[:auth],
#       vapid: {
#         subject: "mailto:ваш_email@example.com",
#         public_key: ENV['VAPID_PUBLIC_KEY'],
#         private_key: ENV['VAPID_PRIVATE_KEY']
#       },
#       ssl_timeout: 5,
#       open_timeout: 5,
#       read_timeout: 5
#     )
#     render json: { message: 'Notification sent.' }, status: :ok
#   end
# end
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