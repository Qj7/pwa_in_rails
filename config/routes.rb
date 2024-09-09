Rails.application.routes.draw do
  root 'locks#index'

  post 'open_lock', to: 'locks#open_lock'

  get "/service-worker.js" => "pwa#service_worker"
  get "/manifest.json" => "pwa#manifest"
end
