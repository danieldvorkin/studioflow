Rails.application.routes.draw do
  # Respond to preflight OPTIONS requests for /graphql (CORS preflight)
  match "/graphql", to: ->(env) { [ 200, { "Content-Type" => "text/plain" }, [ "OK" ] ] }, via: :options
  post "/graphql", to: "graphql#execute"

  post "/stripe/platform-webhook", to: "platform_webhooks#receive"
  post "/webhooks", to: "webhooks#receive"
  post "/contact",  to: "contacts#create"

  # ── Owner-managed API tokens (JWT-authenticated) ─────────────────────────────
  # Used by the web dashboard to generate / list / revoke long-lived API tokens.
  namespace :api do
    resources :tokens, only: [ :index, :create, :destroy ]
  end

  # ── Public REST API (API-token-authenticated) ─────────────────────────────────
  namespace :api do
    namespace :v1 do
      get  "me",     to: "me#show"
      get  "studio", to: "me#studio"

      # Owner / Staff
      resources :clients, only: [ :index, :show ]
      resources :sessions, only: [ :index, :show ]

      # Instructor
      namespace :instructor do
        resources :sessions, only: [ :index ] do
          member do
            get :bookings
          end
        end
        resources :payouts, only: [ :index ]
      end

      # Client (self-service)
      namespace :client do
        resources :bookings,         only: [ :index ]
        resources :memberships,      only: [ :index ]
        resources :bundle_purchases, only: [ :index ]
      end
    end
  end

  # Native iOS Google Sign-In REST endpoint
  # Accepts: { id_token: "..." } or { access_token: "..." }
  # Returns: { token: "<jwt>", user: { ... } }
  match "/auth/google", to: ->(env) { [ 200, { "Content-Type" => "text/plain" }, [ "OK" ] ] }, via: :options
  post  "/auth/google", to: "auth#google"

  if Rails.env.development?
    mount GraphiQL::Rails::Engine, at: "/graphiql", graphql_path: "/graphql"
    get "/voyager", to: "voyager#show"
  end

  devise_for :users
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  # root "posts#index"
end
