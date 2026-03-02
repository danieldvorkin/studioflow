Rails.application.routes.draw do
  # Respond to preflight OPTIONS requests for /graphql (CORS preflight)
  match "/graphql", to: ->(env) { [200, { 'Content-Type' => 'text/plain' }, ['OK']] }, via: :options
  post "/graphql", to: "graphql#execute"

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
